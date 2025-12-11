/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { buildNode as buildFunctionNode } from '@kbn/es-query/src/kuery/node_types/function';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../constants';
import type { Installation } from '../../types';
import { installationStatuses } from '../../../common/constants';
import { type HTTPAuthorizationHeader } from '../../../common/http_authorization_header';

import { stepCreateAlertingRules } from '../epm/packages/install_state_machine/steps/step_create_alerting_rules';

export async function ensureDeferredAlertingRules(
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  spaceId: string,
  authorizationHeader: HTTPAuthorizationHeader
) {
  // Query for installed packages that have deferred alerting rules to be installed
  const _filter = `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.installed_kibana:{ type: "alert" AND deferred: true }`;
  const filter = nodeBuilder.and([
    nodeBuilder.is(
      `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status`,
      installationStatuses.Installed
    ),
    buildFunctionNode(
      'nested',
      `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.installed_kibana`,
      nodeBuilder.and([nodeBuilder.is('type', 'alert'), nodeBuilder.is('deferred', 'true')])
    ),
  ]);
  const packageInstallations = await savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    filter,
    fields: ['installed_kibana', 'name', 'version'],
    perPage: 100,
  });

  console.log('Packages with deferred:', JSON.stringify(packageInstallations, null, 2));

  // await stepCreateAlertingRules({
  //   logger,
  //   savedObjectsClient,
  //   esClient,
  //   packageInstallContext: {
  //     packageInfo,
  //     paths: installedPkgWithAssets.paths,
  //     archiveIterator: createArchiveIteratorFromMap(installedPkgWithAssets.assetsMap),
  //   },
  //   spaceId,
  //   authorizationHeader,
  // });
}
