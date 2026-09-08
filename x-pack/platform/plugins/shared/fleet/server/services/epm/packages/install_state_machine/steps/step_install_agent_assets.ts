/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { parse as parseYaml } from 'yaml';
import pMap from 'p-map';

import type { AgentCreateRequest } from '@kbn/agent-builder-common';
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { KibanaAssetType, KibanaSavedObjectType } from '../../../../../../common/types';
import type { KibanaAssetReference } from '../../../../../../common/types';
import { getPathParts } from '../../../archive';
import { appContextService } from '../../../../app_context';
import { saveKibanaAssetsRefs } from '../../install';
import { withPackageSpan } from '../../utils';
import { createFleetInternalRequest } from '../../../../security/fake_request';
import type { InstallContext } from '../_state_machine_package_install';
import {
  getFleetPackageWorkflowId,
  resolvePackagePolicyConnectorVars,
  substituteWorkflowConnectorIds,
} from './step_install_workflow_assets';

export const getFleetPackageAgentId = (params: {
  pkgName: string;
  spaceId: string;
  fileName: string;
}): string => getFleetPackageWorkflowId(params);

/** AB-002: only platform-owned tools may be bound by a packaged agent. */
export const PLATFORM_TOOL_PREFIX = 'platform.';

interface FleetPackageAgentYaml {
  name: string;
  description: string;
  labels?: string[];
  avatar_color?: string;
  avatar_symbol?: string;
  configuration: AgentCreateRequest['configuration'];
}

export const parseFleetAgentYaml = (
  yamlContent: string,
  agentId: string,
  options?: { pkgName?: string }
): AgentCreateRequest => {
  const parsed = parseYaml(yamlContent) as FleetPackageAgentYaml;

  if (!parsed.name || !parsed.description || !parsed.configuration?.tools?.length) {
    throw new Error(
      `Invalid agent asset ${agentId}: name, description, and configuration.tools are required`
    );
  }
  // AB-002: package agents may only bind platform-owned tools. Binding a
  // solution-owned tool (security_solution.*, observability.*, ...) makes the
  // package depend on a solution plugin being installed and enabled, which is the
  // coupling package-managed agents exist to avoid. Fail the install loudly rather
  // than let the agent resolve to a missing tool at converse time.
  const foreignToolIds = parsed.configuration.tools
    .flatMap((toolGroup) => toolGroup.tool_ids ?? [])
    .filter((toolId) => !toolId.startsWith(PLATFORM_TOOL_PREFIX));

  if (foreignToolIds.length) {
    throw new Error(
      `Invalid agent asset ${agentId}: package agents may only use platform tools ` +
        `(${PLATFORM_TOOL_PREFIX}*), got ${foreignToolIds.join(', ')}`
    );
  }

  return {
    id: agentId,
    name: parsed.name,
    description: parsed.description,
    // AB-004: package-managed governance metadata — UI shows the managed badge
    // and warns/blocks instruction edits; upgrades overwrite (createOrUpdate).
    labels: [
      ...new Set([
        ...(parsed.labels ?? []),
        'managed_by_package',
        // Identify the owning package by name. Deriving it by slicing the agent
        // id is wrong: the id is `fleet-<space>-<pkg>-<file>`, so a positional
        // slice yields the id prefix (and breaks outright for hyphenated
        // package names), leaving upgrades unable to match agent to package.
        ...(options?.pkgName ? [`fleet-package:${options.pkgName}`] : []),
      ]),
    ],
    readonly: true,
    avatar_color: parsed.avatar_color,
    avatar_symbol: parsed.avatar_symbol,
    configuration: parsed.configuration,
  };
};

export async function stepInstallAgentAssets(
  context: Pick<
    InstallContext,
    'logger' | 'savedObjectsClient' | 'packageInstallContext' | 'spaceId' | 'request'
  > & { installAsAdditionalSpace?: boolean }
) {
  const { logger, savedObjectsClient, packageInstallContext, spaceId, installAsAdditionalSpace } =
    context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;
  const agentBuilderApi = appContextService.getAgentBuilderSetup()?.management;

  if (!agentBuilderApi) {
    logger.debug(`Skipping agent asset installation for ${pkgName}: agentBuilder unavailable`);
    return;
  }

  const request = context.request ?? createFleetInternalRequest();
  if (!context.request) {
    logger.debug(
      `Installing agent assets for ${pkgName} using Fleet internal request (no install request context)`
    );
  }

  await withPackageSpan(`Install package agents for ${pkgName}`, async () => {
    const agentEntries: Array<{ fileName: string; yaml: string }> = [];

    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        if (!entry.buffer) {
          return;
        }

        agentEntries.push({
          fileName: path.basename(entry.path),
          yaml: entry.buffer.toString('utf8'),
        });
      },
      (entryPath) => {
        const parts = getPathParts(entryPath);
        return parts.service === 'kibana' && parts.type === KibanaAssetType.agent;
      }
    );

    if (agentEntries.length === 0) {
      return;
    }

    const connectorVars = await resolvePackagePolicyConnectorVars(
      savedObjectsClient as SavedObjectsClientContract,
      pkgName
    );

    const assetRefs: KibanaAssetReference[] = [];

    await pMap(
      agentEntries,
      async ({ fileName, yaml }) => {
        const agentId = getFleetPackageAgentId({ pkgName, spaceId, fileName });
        const agentYaml = substituteWorkflowConnectorIds(yaml, connectorVars);
        const definition = parseFleetAgentYaml(agentYaml, agentId, { pkgName });

        await agentBuilderApi.createOrUpdateAgent(definition, request);

        assetRefs.push({
          id: agentId,
          type: KibanaSavedObjectType.agent,
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
