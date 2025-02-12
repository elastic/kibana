/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { sortBy, uniqBy } from 'lodash';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { ErrorResponseBase } from '@elastic/elasticsearch/lib/api/types';
import pMap from 'p-map';

import { MAX_CONCURRENT_TRANSFORMS_OPERATIONS } from '../../../../constants';
import type { SecondaryAuthorizationHeader } from '../../../../../common/types/models/transform_api_key';
import { updateEsAssetReferences } from '../../packages/es_assets_reference';
import type { Installation } from '../../../../../common';
import { ElasticsearchAssetType, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';
import { retryTransientEsErrors } from '../retry';

interface FleetTransformMetadata {
  fleet_transform_version?: string;
  order?: number;
  package?: { name: string };
  managed?: boolean;
  managed_by?: string;
  installed_by?: string;
  last_authorized_by?: string;
  run_as_kibana_system?: boolean;
  transformId: string;
  unattended?: boolean;
}

const isErrorResponse = (arg: unknown): arg is ErrorResponseBase =>
  isPopulatedObject(arg, ['error']);

async function reauthorizeAndStartTransform({
  esClient,
  logger,
  transformId,
  secondaryAuth,
  meta,
  shouldStopBeforeStart,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  transformId: string;
  secondaryAuth?: SecondaryAuthorizationHeader;
  shouldInstallSequentially?: boolean;
  meta?: object;
  shouldStopBeforeStart?: boolean;
}): Promise<{ transformId: string; success: boolean; error: null | any }> {
  try {
    await retryTransientEsErrors(
      () =>
        esClient.transform.updateTransform(
          {
            transform_id: transformId,
            body: { _meta: meta },
          },
          { ...(secondaryAuth ? secondaryAuth : {}) }
        ),
      { logger, additionalResponseStatuses: [400] }
    );

    logger.debug(`Updated transform: ${transformId}`);
  } catch (err) {
    logger.error(`Failed to update transform: ${transformId} because ${err}`);
    return { transformId, success: false, error: err };
  }

  try {
    // For unattended transforms, we need to stop the transform before starting it
    // otherwise, starting transform will fail with a 409 error
    if (shouldStopBeforeStart) {
      await retryTransientEsErrors(
        () =>
          esClient.transform.stopTransform(
            { transform_id: transformId, wait_for_completion: true },
            { ignore: [404, 409] }
          ),
        { logger, additionalResponseStatuses: [400] }
      );
    }
    const startedTransform = await retryTransientEsErrors(
      () => esClient.transform.startTransform({ transform_id: transformId }, { ignore: [409] }),
      { logger, additionalResponseStatuses: [400] }
    );

    // Transform can already be started even without sufficient permission if 'unattended: true'
    // So we are just catching that special case to showcase in the UI
    // If unattended, calling _start will return a successful response, but with the error message in the body
    if (
      isErrorResponse(startedTransform) &&
      startedTransform.status === 409 &&
      Array.isArray(startedTransform.error?.root_cause) &&
      startedTransform.error.root_cause[0]?.reason?.includes('already started')
    ) {
      return { transformId, success: true, error: null };
    }

    logger.debug(`Started transform: ${transformId}`);
    return { transformId, success: startedTransform.acknowledged, error: null };
  } catch (err) {
    logger.error(`Failed to start transform: ${transformId} because ${err}`);
    return { transformId, success: false, error: err };
  }
}
export async function handleTransformReauthorizeAndStart({
  esClient,
  savedObjectsClient,
  logger,
  pkgName,
  pkgVersion,
  transforms,
  secondaryAuth,
  username,
}: {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  transforms: Array<{ transformId: string }>;
  pkgName: string;
  pkgVersion?: string;
  secondaryAuth?: SecondaryAuthorizationHeader;
  username?: string;
}): Promise<Array<{ transformId: string; success: boolean; error: null | any }>> {
  if (!secondaryAuth) {
    throw Error(
      'A valid secondary authorization with sufficient `manage_transform` permission is needed to re-authorize and start transforms. ' +
        'This could be because security is not enabled, or API key cannot be generated.'
    );
  }

  const transformInfos = await retryTransientEsErrors(
    () =>
      esClient.transform.getTransform(
        {
          transform_id: transforms.map((t) => t.transformId).join(','),
        },
        { ...(secondaryAuth ? secondaryAuth : {}), ignore: [404] }
      ),
    { logger, additionalResponseStatuses: [400] }
  );
  const transformsMetadata: FleetTransformMetadata[] = transformInfos.transforms
    .map<FleetTransformMetadata>((transform) => {
      return {
        ...transform._meta,
        transformId: transform?.id,
        unattended: Boolean(transform.settings?.unattended),
      };
    })
    .filter((t) => t?.run_as_kibana_system === false);

  const shouldInstallSequentially =
    uniqBy(transformsMetadata, 'order').length === transforms.length;

  let authorizedTransforms = [];

  if (shouldInstallSequentially) {
    const sortedTransformsMetadata = sortBy(transformsMetadata, [
      (t) => t.package?.name,
      (t) => t.fleet_transform_version,
      (t) => t.order,
    ]);

    for (const { transformId, unattended, ...meta } of sortedTransformsMetadata) {
      const authorizedTransform = await reauthorizeAndStartTransform({
        esClient,
        logger,
        transformId,
        secondaryAuth,
        meta: { ...meta, last_authorized_by: username },
        shouldStopBeforeStart: unattended,
      });

      authorizedTransforms.push(authorizedTransform);
    }
  } else {
    // Else, create & start all the transforms at once for speed
    authorizedTransforms = await pMap(
      transformsMetadata,
      async ({ transformId, unattended, ...meta }) =>
        reauthorizeAndStartTransform({
          esClient,
          logger,
          transformId,
          secondaryAuth,
          meta: { ...meta, last_authorized_by: username },
          shouldStopBeforeStart: unattended,
        }),
      {
        concurrency: MAX_CONCURRENT_TRANSFORMS_OPERATIONS,
      }
    ).then((results) => results.flat());
  }

  const so = await savedObjectsClient.get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName);
  const esReferences = so.attributes.installed_es ?? [];

  const successfullyAuthorizedTransforms = authorizedTransforms.filter((t) => t.success);
  const authorizedTransformsRefs = successfullyAuthorizedTransforms.map((t) => ({
    type: ElasticsearchAssetType.transform,
    id: t.transformId,
    version: pkgVersion,
  }));
  await updateEsAssetReferences(savedObjectsClient, pkgName, esReferences, {
    assetsToRemove: authorizedTransformsRefs,
    assetsToAdd: authorizedTransformsRefs,
  });
  return authorizedTransforms;
}
