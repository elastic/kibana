/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { FLEET_ELASTIC_AGENT_PACKAGE } from '../../../common/constants';
import { type HTTPAuthorizationHeader } from '../../../common/http_authorization_header';
import { getInstalledPackageWithAssets, getInstallationObject } from '../epm/packages/get';
import { stepCreateAlertingRules } from '../epm/packages/install_state_machine/steps/step_create_alerting_rules';
import { createArchiveIteratorFromMap } from '../epm/archive/archive_iterator';

export async function ensureDeferredAlertingRules(
  logger: Logger,
  savedObjectsClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  spaceId: string,
  authorizationHeader: HTTPAuthorizationHeader
) {
  const installedPkgWithAssets = await getInstalledPackageWithAssets({
    savedObjectsClient,
    pkgName: FLEET_ELASTIC_AGENT_PACKAGE,
    logger,
  });

  if (!installedPkgWithAssets) {
    return;
  }

  const installation = await getInstallationObject({
    pkgName: FLEET_ELASTIC_AGENT_PACKAGE,
    savedObjectsClient,
  });

  if (!installation) {
    return;
  }

  const deferredRules = installation.attributes.installed_kibana.filter(
    (asset) => asset.type === 'alert' && asset.deferred
  );

  if (deferredRules.length === 0) {
    return;
  }

  const { packageInfo, paths, assetsMap } = installedPkgWithAssets;

  await stepCreateAlertingRules({
    logger,
    savedObjectsClient,
    esClient,
    packageInstallContext: {
      packageInfo,
      paths,
      archiveIterator: createArchiveIteratorFromMap(assetsMap),
    },
    spaceId,
    authorizationHeader,
  });
}
