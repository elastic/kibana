/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import pMap from 'p-map';
import { parse, stringify } from 'yaml';

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { KibanaAssetType, KibanaSavedObjectType } from '../../../../../../common/types';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { getPathParts } from '../../../archive';
import { appContextService } from '../../../../app_context';
import { packagePolicyService } from '../../../../package_policy';
import { saveKibanaAssetsRefs } from '../../install';
import { withPackageSpan } from '../../utils';
import type { InstallContext } from '../_state_machine_package_install';

const VAR_PLACEHOLDER_PREFIX = 'REPLACE_WITH_';

const formatManifestVarForSubstitution = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .join(',');
    return joined.length > 0 ? joined : undefined;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
};

const getPlaceholderForVarName = (varName: string): string =>
  `${VAR_PLACEHOLDER_PREFIX}${varName.toUpperCase()}`;

export const substituteWorkflowConnectorIds = (
  yaml: string,
  vars: Record<string, unknown>,
  logger?: Logger
): string => {
  const { yaml: result } = substituteWorkflowConnectorIdsWithUnresolved(yaml, vars, logger);
  return result;
};

export const substituteWorkflowConnectorIdsWithUnresolved = (
  yaml: string,
  vars: Record<string, unknown>,
  logger?: Logger
): { yaml: string; unresolved: string[] } => {
  let result = yaml;

  const substitutions = Object.entries(vars)
    .map(([varName, value]): [string, string | undefined] => [
      getPlaceholderForVarName(varName),
      formatManifestVarForSubstitution(value),
    ])
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .sort(([a], [b]) => b.length - a.length);

  for (const [placeholder, formatted] of substitutions) {
    result = result.replaceAll(placeholder, formatted);
  }

  const placeholderRegex = new RegExp(`${VAR_PLACEHOLDER_PREFIX}[A-Z0-9_]+`, 'g');
  const remaining = [...result.matchAll(placeholderRegex)].map((match) => match[0]);
  const unresolved = [...new Set(remaining)];

  if (logger) {
    for (const placeholder of unresolved) {
      logger.warn(`Workflow placeholder ${placeholder} has no matching package policy var`);
    }
  }

  return { yaml: result, unresolved };
};

export const resolvePackagePolicyConnectorVars = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string
): Promise<Record<string, unknown>> => {
  try {
    const policies = await packagePolicyService.list(savedObjectsClient, {
      perPage: 20,
      kuery: `ingest-package-policies.package.name:${pkgName}`,
    });
    const policy = policies.items.find((item) => item.package?.name === pkgName);
    if (!policy?.vars) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(policy.vars).map(([key, config]) => [key, config.value ?? config])
    );
  } catch {
    return {};
  }
};

/**
 * Workflow IDs must match human-readable slug rules (lowercase alnum + hyphens only).
 * Fleet package names often contain underscores (for example `sdlc_intel`).
 */
export const normalizeFleetPackageAssetIdSegment = (segment: string): string =>
  segment.toLowerCase().replace(/_/g, '-');

export const getFleetPackageWorkflowId = (params: {
  pkgName: string;
  spaceId: string;
  fileName: string;
}): string => {
  const baseName = params.fileName.replace(/\.ya?ml$/i, '');
  return `fleet-${normalizeFleetPackageAssetIdSegment(
    params.spaceId
  )}-${normalizeFleetPackageAssetIdSegment(params.pkgName)}-${baseName}`;
};

const FLEET_AGENT_PLACEHOLDER_PREFIX = 'REPLACE_WITH_FLEET_AGENT_';

export const substituteFleetAgentIds = (
  yaml: string,
  params: { pkgName: string; spaceId: string }
): string => {
  let result = yaml;
  const placeholderRegex = new RegExp(`${FLEET_AGENT_PLACEHOLDER_PREFIX}([a-z0-9_-]+)`, 'gi');
  const matches = yaml.matchAll(placeholderRegex);

  for (const match of matches) {
    const fileBase = match[1];
    const agentId = getFleetPackageWorkflowId({
      pkgName: params.pkgName,
      spaceId: params.spaceId,
      fileName: `${fileBase}.yaml`,
    });
    result = result.replaceAll(match[0], agentId);
  }

  return result;
};

export async function stepInstallWorkflowAssets(
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'request'
  > & { installAsAdditionalSpace?: boolean }
) {
  const { logger, savedObjectsClient, packageInstallContext, spaceId, installAsAdditionalSpace } =
    context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;
  const workflowsApi = appContextService.getWorkflowsManagementSetup()?.management;

  if (!workflowsApi) {
    logger.debug(
      `Skipping workflow asset installation for ${pkgName}: workflowsManagement unavailable`
    );
    return;
  }

  if (!context.request) {
    logger.debug(
      `Skipping workflow asset installation for ${pkgName}: missing install request context`
    );
    return;
  }

  await withPackageSpan(`Install package workflows for ${pkgName}`, async () => {
    const workflowEntries: Array<{ fileName: string; yaml: string }> = [];

    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }

        workflowEntries.push({
          fileName: path.basename(entry.path),
          yaml: entry.buffer.toString('utf8'),
        });
      },
      (entryPath) => {
        const parts = getPathParts(entryPath);
        return parts.service === 'kibana' && parts.type === KibanaAssetType.workflow;
      }
    );

    if (workflowEntries.length === 0) {
      return;
    }

    const connectorVars = await resolvePackagePolicyConnectorVars(savedObjectsClient, pkgName);

    const assetRefs: KibanaAssetReference[] = [];

    await pMap(
      workflowEntries,
      async ({ fileName, yaml }) => {
        const workflowId = getFleetPackageWorkflowId({ pkgName, spaceId, fileName });
        const { yaml: substitutedYaml, unresolved } = substituteWorkflowConnectorIdsWithUnresolved(
          yaml,
          connectorVars,
          logger
        );
        let workflowYaml = substituteFleetAgentIds(substitutedYaml, { pkgName, spaceId });

        const workflowDefinition = parse(workflowYaml) as {
          enabled?: boolean;
          steps?: Array<{ enabled?: boolean }>;
        };
        const resolvedIntent = resolveWorkflowEnabledIntent(
          packageInfo.workflows?.default_enabled,
          fileName
        );

        if (resolvedIntent && unresolved.length > 0) {
          logger.warn(
            `Workflow ${workflowId} has unresolved placeholders [${unresolved.join(
              ', '
            )}] — forcing disabled`
          );
          workflowDefinition.enabled = false;
        } else if (resolvedIntent !== undefined) {
          workflowDefinition.enabled = resolvedIntent;
        }

        workflowYaml = stringify(workflowDefinition);

        const existingWorkflow = await workflowsApi.getWorkflow(workflowId, spaceId);

        const managedWorkflowFields = {
          managed: true,
          managedBy: pkgName,
          managedVersion: null,
        };

        if (existingWorkflow) {
          await workflowsApi.updateWorkflow(
            workflowId,
            { yaml: workflowYaml, ...managedWorkflowFields },
            spaceId,
            context.request!,
            { allowManagedWorkflowMutation: true }
          );
        } else {
          await workflowsApi.createWorkflow(
            { id: workflowId, yaml: workflowYaml },
            spaceId,
            context.request!
          );
          await workflowsApi.updateWorkflow(
            workflowId,
            { yaml: workflowYaml, ...managedWorkflowFields },
            spaceId,
            context.request!,
            { allowManagedWorkflowMutation: true }
          );
        }

        assetRefs.push({
          id: workflowId,
          type: KibanaSavedObjectType.workflow,
        });
      },
      { concurrency: 3 }
    );

    await saveKibanaAssetsRefs(
      savedObjectsClient,
      pkgName,
      assetRefs,
      spaceId,
      installAsAdditionalSpace,
      true
    );
  });
}

export const resolveWorkflowEnabledIntent = (
  defaultEnabled: boolean | string[] | undefined,
  fileName: string
): boolean | undefined => {
  if (defaultEnabled === undefined) {
    return undefined;
  }

  if (typeof defaultEnabled === 'boolean') {
    return defaultEnabled;
  }

  if (Array.isArray(defaultEnabled)) {
    return defaultEnabled.includes(fileName);
  }

  return undefined;
};

export const applyWorkflowEnablement = (
  yaml: string,
  resolvedIntent: boolean | undefined,
  unresolved: string[],
  logger: Logger
): { yaml: string } => {
  const workflowDefinition = parse(yaml) as {
    enabled?: boolean;
    steps?: Array<{ enabled?: boolean }>;
  };

  if (resolvedIntent && unresolved.length > 0) {
    logger.warn(
      `Workflow has unresolved placeholders [${unresolved.join(', ')}] — forcing disabled`
    );
    workflowDefinition.enabled = false;
  } else if (resolvedIntent !== undefined) {
    workflowDefinition.enabled = resolvedIntent;
  }

  return { yaml: stringify(workflowDefinition) };
};
