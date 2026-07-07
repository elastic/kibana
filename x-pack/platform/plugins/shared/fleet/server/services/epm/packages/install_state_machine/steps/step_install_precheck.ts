/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureFleetGlobalEsAssets } from '../../../../setup/ensure_fleet_global_es_assets';
import { appContextService } from '../../../..';

import {
  DATA_STREAM_TYPES_DEPRECATED_ILMS,
  getILMMigrationStatus,
  getILMPolicies,
  getILMPolicy,
  saveILMMigrationChanges,
} from '../../../elasticsearch/template/default_settings';

import { withPackageSpan } from '../../utils';

export async function stepInstallPrecheck() {
  await Promise.all([checkILMMigrationStatus(), ensureFleetGlobalAssets()]);
}

async function ensureFleetGlobalAssets() {
  await withPackageSpan('Ensure Fleet Global Assets', () =>
    ensureFleetGlobalEsAssets(
      {
        logger: appContextService.getLogger(),
        esClient: appContextService.getInternalUserESClient(),
        soClient: appContextService.getInternalUserSOClient(),
      },
      {
        reinstallPackages: false,
      }
    )
  );
}

async function checkILMMigrationStatus() {
  const isILMPoliciesDisabled =
    appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  if (isILMPoliciesDisabled) {
    return;
  }

  await withPackageSpan('Check ILM migration status', async () => {
    const ilmMigrationStatusMap = await getILMMigrationStatus();
    const updatedILMMigrationStatusMap = new Map(ilmMigrationStatusMap);

    const ilmPolicies = await getILMPolicies(DATA_STREAM_TYPES_DEPRECATED_ILMS);

    for (const dataStreamType of DATA_STREAM_TYPES_DEPRECATED_ILMS) {
      const ilmPolicy = getILMPolicy(dataStreamType, ilmMigrationStatusMap, ilmPolicies);

      if (ilmPolicy === `${dataStreamType}@lifecycle`) {
        updatedILMMigrationStatusMap.set(dataStreamType, 'success');
      }
    }

    await saveILMMigrationChanges(updatedILMMigrationStatusMap);
  });
}
