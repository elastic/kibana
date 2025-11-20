/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../../../..';

import {
  getILMMigrationStatus,
  getILMPolicies,
  getILMPolicy,
  saveILMMigrationChanges,
} from '../../../elasticsearch/template/default_settings';

import { withPackageSpan } from '../../utils';

export async function stepInstallPrecheck() {
  const isILMPoliciesDisabled =
    appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  if (isILMPoliciesDisabled) {
    return;
  }

  await withPackageSpan('Check ILM migration status', async () => {
    const ilmMigrationStatusMap = await getILMMigrationStatus();
    const updatedILMMigrationStatusMap = new Map(ilmMigrationStatusMap);

    const dataStreamTypes = ['logs', 'metrics', 'synthetics'];
    const ilmPolicies = await getILMPolicies(dataStreamTypes);

    for (const dataStreamType of dataStreamTypes) {
      const ilmPolicy = getILMPolicy(dataStreamType, ilmMigrationStatusMap, ilmPolicies);

      if (ilmPolicy === `${dataStreamType}@lifecycle`) {
        updatedILMMigrationStatusMap.set(dataStreamType, 'success');
      }
    }

    await saveILMMigrationChanges(updatedILMMigrationStatusMap);
  });
}
