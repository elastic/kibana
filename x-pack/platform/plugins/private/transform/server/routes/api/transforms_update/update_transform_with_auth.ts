/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, Headers, KibanaRequest } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import type { TransformId } from '../../../../common/types/transform';
import type { RouteDependencies } from '../../../types';
import type { PostTransformsUpdateRequestSchema } from '../../api_schemas/update_transforms';

const AUTO_GENERATED_TRANSFORM_API_KEY_NAME = 'auto-generated-transform-api-key';

const hasProjectRoutingUpdate = (body: PostTransformsUpdateRequestSchema): boolean =>
  body.source?.project_routing !== undefined;

const hasUiamAuthorization = (authorization: unknown): boolean => {
  if (authorization === null || typeof authorization !== 'object') {
    return false;
  }

  return 'cloud_api_key' in authorization || 'credential_id' in authorization;
};

const getExistingTransform = async (
  esClient: ElasticsearchClient,
  transformId: TransformId
): Promise<estypes.TransformGetTransformTransformSummary | undefined> => {
  try {
    const response = await esClient.transform.getTransform({ transform_id: transformId });
    return response.transforms[0];
  } catch {
    return undefined;
  }
};

const getUpdateBody = (
  body: PostTransformsUpdateRequestSchema,
  existingTransform?: estypes.TransformGetTransformTransformSummary
): PostTransformsUpdateRequestSchema => {
  if (!body.source || !existingTransform?.source) {
    return body;
  }

  return {
    ...body,
    source: {
      ...existingTransform.source,
      ...body.source,
    },
  };
};

const getUiamAuthenticatedRequest = (
  request: KibanaRequest,
  uiamApiKey: string
): { headers: Headers } => {
  const headers: Headers = {
    ...request.headers,
    authorization: `ApiKey ${uiamApiKey}`,
  };
  return { headers };
};

const grantUiamApiKey = async (request: KibanaRequest, coreStart: Pick<CoreStart, 'security'>) => {
  try {
    return await coreStart.security.authc.apiKeys.uiam?.grant(request, {
      name: AUTO_GENERATED_TRANSFORM_API_KEY_NAME,
    });
  } catch {
    return undefined;
  }
};

export const updateTransformWithAuth = async ({
  body,
  esClient,
  request,
  routeDependencies,
  transformId,
}: {
  body: PostTransformsUpdateRequestSchema;
  esClient: ElasticsearchClient;
  request: KibanaRequest;
  routeDependencies: Pick<RouteDependencies, 'getCoreStart'>;
  transformId: TransformId;
}) => {
  const existingTransform = body.source
    ? await getExistingTransform(esClient, transformId)
    : undefined;
  const updateBody = getUpdateBody(body, existingTransform);
  const updateTransform = (client: ElasticsearchClient) =>
    client.transform.updateTransform({
      // @ts-expect-error query doesn't satisfy QueryDslQueryContainer from @elastic/elasticsearch
      body: updateBody,
      transform_id: transformId,
    });

  if (!hasProjectRoutingUpdate(body) || hasUiamAuthorization(existingTransform?.authorization)) {
    return updateTransform(esClient);
  }

  const coreStart = await routeDependencies.getCoreStart();
  const uiamApiKey = await grantUiamApiKey(request, coreStart);

  if (!uiamApiKey) {
    return updateTransform(esClient);
  }

  const uiamAuthenticatedRequest = getUiamAuthenticatedRequest(request, uiamApiKey.api_key);
  const uiamEsClient =
    coreStart.elasticsearch.client.asScoped(uiamAuthenticatedRequest).asCurrentUser;

  return updateTransform(uiamEsClient);
};
