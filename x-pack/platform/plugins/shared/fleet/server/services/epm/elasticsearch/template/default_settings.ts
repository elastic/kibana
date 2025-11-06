/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmGetLifecycleLifecycle } from '@elastic/elasticsearch/lib/api/types';

import { appContextService } from '../../../app_context';
import { getSettings, saveSettings } from '../../../settings';

export async function getILMPolicies(
  dataStreamTypes: string[]
): Promise<
  Map<
    string,
    { deprecatedILMPolicy?: IlmGetLifecycleLifecycle; newILMPolicy?: IlmGetLifecycleLifecycle }
  >
> {
  const esClient = appContextService.getInternalUserESClient();

  const ilmPolicies = new Map<
    string,
    { deprecatedILMPolicy?: IlmGetLifecycleLifecycle; newILMPolicy?: IlmGetLifecycleLifecycle }
  >();

  for (const dataStreamType of dataStreamTypes) {
    const deprecatedILMPolicyName = dataStreamType;
    const newILMPolicyName = `${dataStreamType}@lifecycle`;

    const deprecatedILMPolicyResponse = await esClient.ilm.getLifecycle(
      {
        name: deprecatedILMPolicyName,
      },
      {
        ignore: [404],
      }
    );
    const deprecatedILMPolicy = deprecatedILMPolicyResponse[deprecatedILMPolicyName];

    const newILMPolicyResponse = await esClient.ilm.getLifecycle(
      { name: newILMPolicyName },
      {
        ignore: [404],
      }
    );
    const newILMPolicy = newILMPolicyResponse[newILMPolicyName];

    ilmPolicies.set(dataStreamType, {
      deprecatedILMPolicy,
      newILMPolicy,
    });
  }

  return ilmPolicies;
}

export async function saveILMMigrationChanges(
  updatedILMMigrationStatusMap: Map<string, 'success' | undefined>
) {
  const soClient = appContextService.getInternalUserSOClient();
  const { ilm_migration_status: ilmMigrationStatus } = await getSettings(soClient);

  const updateILMMigrationStatus = {
    logs: updatedILMMigrationStatusMap.get('logs'),
    metrics: updatedILMMigrationStatusMap.get('metrics'),
    synthetics: updatedILMMigrationStatusMap.get('synthetics'),
  };

  if (
    (updateILMMigrationStatus.logs === 'success' && ilmMigrationStatus?.logs !== 'success') ||
    (updateILMMigrationStatus.metrics === 'success' && ilmMigrationStatus?.metrics !== 'success') ||
    (updateILMMigrationStatus.synthetics === 'success' &&
      ilmMigrationStatus?.synthetics !== 'success')
  ) {
    appContextService
      .getLogger()
      .info(`Saving ILM migration status changes: ${JSON.stringify(updateILMMigrationStatus)}`);

    await saveSettings(soClient, {
      ilm_migration_status: {
        ...ilmMigrationStatus,
        ...updateILMMigrationStatus,
      },
    });
  }
}

export async function getILMMigrationStatus(): Promise<Map<string, 'success' | undefined>> {
  const soClient = appContextService.getInternalUserSOClient();

  const { ilm_migration_status: ilmMigrationStatus } = await getSettings(soClient);
  const ilmMigrationStatusMap = new Map<string, 'success' | undefined>([
    ['logs', ilmMigrationStatus?.logs],
    ['metrics', ilmMigrationStatus?.metrics],
    ['synthetics', ilmMigrationStatus?.synthetics],
  ]);

  return ilmMigrationStatusMap;
}

function getILMPolicy(
  type: string,
  ilmMigrationStatusMap: Map<string, 'success' | undefined>,
  ilmPolicies: Map<
    string,
    { deprecatedILMPolicy?: IlmGetLifecycleLifecycle; newILMPolicy?: IlmGetLifecycleLifecycle }
  >
): string {
  const deprecatedILMPolicyName = type;
  const newILMPolicyName = `${type}@lifecycle`;

  if (ilmMigrationStatusMap.get(type) === 'success') {
    return newILMPolicyName;
  }

  const { deprecatedILMPolicy, newILMPolicy } = ilmPolicies.get(type) ?? {};

  // deprecated and new ILM policies are not modified, mark migration as success
  if (deprecatedILMPolicy?.version === 1 && newILMPolicy?.version === 1) {
    return newILMPolicyName;
  }
  // otherwise if deprecated ILM policy does not exist, use the new ILM policy
  if (!deprecatedILMPolicy) {
    return newILMPolicyName;
  }
  // otherwise if the deprecated ILM policy is not used, use the new ILM policy
  if (
    deprecatedILMPolicy?.version > 1 &&
    (deprecatedILMPolicy as any).in_use_by?.composable_templates?.length === 0
  ) {
    return newILMPolicyName;
  }

  return deprecatedILMPolicyName;
}

export function buildDefaultSettings({
  ilmPolicy,
  type,
  isOtelInputType,
  ilmMigrationStatusMap,
  ilmPolicies,
}: {
  type: string;
  ilmPolicy?: string | undefined;
  isOtelInputType?: boolean;
  ilmMigrationStatusMap: Map<string, 'success' | undefined>;
  ilmPolicies: Map<
    string,
    { deprecatedILMPolicy?: IlmGetLifecycleLifecycle; newILMPolicy?: IlmGetLifecycleLifecycle }
  >;
}) {
  const isILMPolicyDisabled = appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  const defaultIlmPolicy = isOtelInputType
    ? `${type}@lifecycle`
    : getILMPolicy(type, ilmMigrationStatusMap, ilmPolicies);

  return {
    index: {
      ...(isILMPolicyDisabled
        ? {}
        : {
            // ILM Policy must be added here, for now point to the default global ILM policy name
            lifecycle: {
              name: ilmPolicy ? ilmPolicy : defaultIlmPolicy,
            },
          }),
    },
  };
}
