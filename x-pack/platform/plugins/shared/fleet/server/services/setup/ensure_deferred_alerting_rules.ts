/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

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
  const packageInstallations = await savedObjectsClient.find<{ installed_kibana_assets: string[] }>(
    {
      type: 'epm-packages',
      filter: `epm-packages.attributes.installed_kibana_assets: "alert"`,
      perPage: 100,
    }
  );

  await stepCreateAlertingRules({
    logger,
    savedObjectsClient,
    esClient,
    packageInstallContext: {
      packageInfo,
      paths: installedPkgWithAssets.paths,
      archiveIterator: createArchiveIteratorFromMap(installedPkgWithAssets.assetsMap),
    },
    spaceId,
    authorizationHeader,
  });
}
