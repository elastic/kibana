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
import { createFleetInternalRequest } from '../../../../security/fake_request';
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

/**
 * Install-time connector/agent placeholder substitution (WF-008).
 * Runtime Liquid `{{ policy.vars.* }}` is not a supported resolution path —
 * see workflow_connector_resolution.md.
 */
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

/**
 * FLEET-012: carry forward values an operator already resolved.
 *
 * The archive always ships `REPLACE_WITH_*` placeholders. Package policy vars
 * resolve them at install, but an operator can also resolve them out of band
 * (deploy scripts, direct edits). Overwriting yaml wholesale on upgrade reverts
 * those live workflows to placeholders and force-disables them, destroying
 * policy-driven state the upgrade contract promises to preserve.
 *
 * For each placeholder still unresolved in the incoming yaml, reuse the value at
 * the same key in the currently-installed workflow. Only placeholders are filled:
 * every other line of the new version is applied as shipped, so genuine
 * definition changes still land.
 */
export const carryForwardResolvedPlaceholders = (
  incomingYaml: string,
  existingYaml: string,
  logger?: Logger
): { yaml: string; carried: string[] } => {
  const placeholderRegex = new RegExp(`${VAR_PLACEHOLDER_PREFIX}[A-Z0-9_]+`, 'g');
  const unresolved = [...new Set([...incomingYaml.matchAll(placeholderRegex)].map((m) => m[0]))];
  if (unresolved.length === 0 || !existingYaml) {
    return { yaml: incomingYaml, carried: [] };
  }
  let result = incomingYaml;
  const carried: string[] = [];
  for (const placeholder of unresolved) {
    // find `<key>: <placeholder>` in the incoming yaml, then read the same key
    // from the installed yaml. Anchoring on the key avoids guessing at values.
    const keyMatch = new RegExp(`^(\\s*)([\\w.-]+):\\s*["']?${placeholder}["']?\\s*$`, 'm').exec(
      result
    );
    if (!keyMatch) {
      continue;
    }
    const key = keyMatch[2];
    const existingMatch = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm').exec(existingYaml);
    const existingValue = existingMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
    if (!existingValue || existingValue.startsWith(VAR_PLACEHOLDER_PREFIX)) {
      continue;
    }
    result = result.replaceAll(placeholder, existingValue);
    carried.push(placeholder);
  }
  // A placeholder can also sit inline (inside a SOQL string, an expression, a URL)
  // rather than as a `key: value` pair. There is no key to anchor on, so diff the
  // two documents line by line: when the only difference between the shipped line
  // and the installed line is the placeholder, the installed line already holds the
  // operator-resolved value.
  const stillUnresolved = [...new Set([...result.matchAll(placeholderRegex)].map((m) => m[0]))];
  if (stillUnresolved.length) {
    const existingLines = existingYaml.split('\n');
    for (const placeholder of stillUnresolved) {
      const shippedLines = result.split('\n');
      let resolvedValue: string | undefined;
      for (const shippedLine of shippedLines) {
        if (!shippedLine.includes(placeholder)) {
          continue;
        }
        const [prefix, suffix] = shippedLine.split(placeholder, 2);
        const candidate = existingLines.find(
          (line) => line.startsWith(prefix) && line.endsWith(suffix) && !line.includes(placeholder)
        );
        if (candidate) {
          resolvedValue = candidate.slice(prefix.length, candidate.length - suffix.length);
          break;
        }
      }
      if (resolvedValue) {
        result = result.replaceAll(placeholder, resolvedValue);
        carried.push(placeholder);
      }
    }
  }
  if (carried.length && logger) {
    logger.debug(
      `Carried forward operator-resolved values for [${carried.join(', ')}] on upgrade`
    );
  }
  return { yaml: result, carried };
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

/**
 * Resolve `REPLACE_WITH_FLEET_AGENT_*` placeholders to deterministic fleet agent
 * ids (AB-006).
 *
 * When `installedAgentIds` is supplied, a placeholder whose resolved id was not
 * installed by this package is reported as unresolved and left in place rather
 * than substituted. Substituting it anyway would mint a well-formed but dangling
 * `fleet-*` id: install succeeds and the workflow only fails later, at run time,
 * with a 404 from the agent API. Callers force such workflows disabled, matching
 * the connector placeholder policy.
 *
 * Resolved ids are always confined to the `fleet-` namespace by
 * `getFleetPackageWorkflowId`, so a placeholder cannot address an arbitrary
 * user-created agent.
 */
export const substituteFleetAgentIdsWithUnresolved = (
  yaml: string,
  params: { pkgName: string; spaceId: string; installedAgentIds?: string[] }
): { yaml: string; unresolved: string[] } => {
  let result = yaml;
  const unresolved: string[] = [];
  const known = params.installedAgentIds ? new Set(params.installedAgentIds) : undefined;
  const placeholderRegex = new RegExp(`${FLEET_AGENT_PLACEHOLDER_PREFIX}([a-z0-9_-]+)`, 'gi');
  const matches = yaml.matchAll(placeholderRegex);

  for (const match of matches) {
    const fileBase = match[1];
    const agentId = getFleetPackageWorkflowId({
      pkgName: params.pkgName,
      spaceId: params.spaceId,
      fileName: `${fileBase}.yaml`,
    });

    if (known && !known.has(agentId)) {
      if (!unresolved.includes(match[0])) {
        unresolved.push(match[0]);
      }
      continue;
    }

    result = result.replaceAll(match[0], agentId);
  }

  return { yaml: result, unresolved };
};

export const substituteFleetAgentIds = (
  yaml: string,
  params: { pkgName: string; spaceId: string; installedAgentIds?: string[] }
): string => substituteFleetAgentIdsWithUnresolved(yaml, params).yaml;

interface WorkflowEntry {
  fileName: string;
  yaml: string;
}

const normalizeWorkflowFileName = (fileName: string): string =>
  fileName.endsWith('.yaml') || fileName.endsWith('.yml') ? fileName : `${fileName}.yaml`;

/**
 * Order package workflow assets so every declared dependency is installed before
 * its dependent. Reject invalid graphs before creating any saved object.
 */
export const orderWorkflowEntriesByDependencies = (
  entries: WorkflowEntry[],
  dependencies: Record<string, string[]> = {}
): WorkflowEntry[] => {
  const byName = new Map(entries.map((entry) => [entry.fileName, entry]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const ordered: WorkflowEntry[] = [];

  const visit = (fileName: string, chain: string[]): void => {
    if (visited.has(fileName)) return;
    if (visiting.has(fileName)) {
      throw new Error(`Workflow dependency cycle: ${[...chain, fileName].join(' -> ')}`);
    }
    const entry = byName.get(fileName);
    if (!entry) {
      throw new Error(`Workflow dependency references missing asset "${fileName}"`);
    }

    visiting.add(fileName);
    for (const dependency of dependencies[fileName] ?? []) {
      visit(normalizeWorkflowFileName(dependency), [...chain, fileName]);
    }
    visiting.delete(fileName);
    visited.add(fileName);
    ordered.push(entry);
  };

  for (const dependencyOwner of Object.keys(dependencies)) {
    const normalizedOwner = normalizeWorkflowFileName(dependencyOwner);
    if (!byName.has(normalizedOwner)) {
      throw new Error(`Workflow dependencies declared for missing asset "${normalizedOwner}"`);
    }
  }
  entries.forEach(({ fileName }) => visit(fileName, []));
  return ordered;
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

  const request = context.request ?? createFleetInternalRequest();

  if (!context.request) {
    logger.debug(
      `Installing workflow assets for ${pkgName} using Fleet internal request (no install request context)`
    );
  }

  await withPackageSpan(`Install package workflows for ${pkgName}`, async () => {
    const workflowEntries: WorkflowEntry[] = [];

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

    const orderedWorkflowEntries = orderWorkflowEntriesByDependencies(
      workflowEntries,
      packageInfo.workflows?.dependencies
    );

    // AB-006: the set of agent ids this package actually installs. Placeholders
    // that do not resolve into this set are left unsubstituted and the workflow
    // is forced disabled, rather than shipping a dangling fleet-* agent id.
    const installedAgentIds: string[] = [];
    await packageInstallContext.archiveIterator.traverseEntries(
      async (entry) => {
        // Directory entries carry no file segment; skip them rather than
        // deriving an id from undefined.
        const { file: fileName } = getPathParts(entry.path);
        if (!fileName) {
          return;
        }
        installedAgentIds.push(getFleetPackageWorkflowId({ pkgName, spaceId, fileName }));
      },
      (entryPath) => {
        const parts = getPathParts(entryPath);
        return parts.service === 'kibana' && parts.type === KibanaAssetType.agent;
      }
    );

    await pMap(
      orderedWorkflowEntries,
      async ({ fileName, yaml }) => {
        const workflowId = getFleetPackageWorkflowId({ pkgName, spaceId, fileName });
        const { yaml: substitutedYaml, unresolved } = substituteWorkflowConnectorIdsWithUnresolved(
          yaml,
          connectorVars,
          logger
        );
        const { yaml: agentSubstitutedYaml, unresolved: unresolvedAgents } =
          substituteFleetAgentIdsWithUnresolved(substitutedYaml, {
            pkgName,
            spaceId,
            installedAgentIds,
          });
        let workflowYaml = agentSubstitutedYaml;
        const allUnresolved = [...unresolved, ...unresolvedAgents];

        const workflowDefinition = parse(workflowYaml) as {
          enabled?: boolean;
          steps?: Array<{ enabled?: boolean }>;
        };
        const resolvedIntent = resolveWorkflowEnabledIntent(
          packageInfo.workflows?.default_enabled,
          fileName
        );

        if (resolvedIntent && allUnresolved.length > 0) {
          logger.warn(
            `Workflow ${workflowId} has unresolved placeholders [${allUnresolved.join(
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
          // FLEET-012: Preserve user-disabled state across upgrades.
          // If the user explicitly disabled a managed workflow, don't re-enable it.
          const existingYaml = existingWorkflow.yaml ?? '';
          // FLEET-012: reuse values the operator already resolved, so an upgrade
          // cannot revert a live workflow to REPLACE_WITH_* placeholders.
          const { yaml: carriedYaml, carried } = carryForwardResolvedPlaceholders(
            workflowYaml,
            existingYaml,
            logger
          );
          if (carried.length) {
            workflowYaml = carriedYaml;
            const carriedDefinition = parse(workflowYaml) as { enabled?: boolean };
            // Re-resolving removes the unresolved-placeholder disable reason.
            if (resolvedIntent !== undefined && carriedDefinition.enabled === false) {
              carriedDefinition.enabled = resolvedIntent;
              workflowYaml = stringify(carriedDefinition);
            }
            workflowDefinition.enabled = (parse(workflowYaml) as { enabled?: boolean }).enabled;
          }
          const existingParsed = parse(existingYaml) as { enabled?: boolean };
          if (existingParsed.enabled === false && workflowDefinition.enabled !== false) {
            logger.debug(
              `Workflow ${workflowId} was disabled by user — preserving disabled state on upgrade`
            );
            workflowDefinition.enabled = false;
            workflowYaml = stringify(workflowDefinition);
          } else if (
            existingParsed.enabled === true &&
            workflowDefinition.enabled === false &&
            resolvedIntent === undefined &&
            allUnresolved.length === 0
          ) {
            // Preservation has to be symmetric. A package ships workflows disabled when
            // it cannot know which connectors a deployment has; the operator enables the
            // ones that work. Re-disabling those on upgrade silently stops live ingest
            // while dashboards keep rendering stale data. Only honour the operator's
            // enablement when every placeholder resolved — an unresolved workflow must
            // still be forced off. An explicit manifest intent (`default_enabled`, or an
            // allowlist entry) always wins: that is the package author deliberately
            // setting policy, not an upgrade silently dropping operator state.
            logger.debug(
              `Workflow ${workflowId} was enabled by user — preserving enabled state on upgrade`
            );
            workflowDefinition.enabled = true;
            workflowYaml = stringify(workflowDefinition);
          }

          await workflowsApi.updateWorkflow(
            workflowId,
            { yaml: workflowYaml, ...managedWorkflowFields },
            spaceId,
            request,
            { allowManagedWorkflowMutation: true }
          );
        } else {
          await workflowsApi.createWorkflow(
            { id: workflowId, yaml: workflowYaml },
            spaceId,
            request
          );
          await workflowsApi.updateWorkflow(
            workflowId,
            { yaml: workflowYaml, ...managedWorkflowFields },
            spaceId,
            request,
            { allowManagedWorkflowMutation: true }
          );
        }

        assetRefs.push({
          id: workflowId,
          type: KibanaSavedObjectType.workflow,
        });
      },
      // Dependency order is load-bearing: enabling a downstream scheduled workflow
      // before its prerequisites are installed can produce empty or partial results.
      { concurrency: 1 }
    );

    await saveKibanaAssetsRefs(
      savedObjectsClient,
      pkgName,
      assetRefs,
      spaceId,
      installAsAdditionalSpace,
      true
    );
    // FLEET-012: Reconcile removed workflows — delete managed workflows that
    // belong to this package but are no longer in the new archive.
    const newAssetIds = new Set(assetRefs.map((r) => r.id));
    const managedWorkflowPrefix = `${spaceId ?? 'default'}-${pkgName}-`;
    try {
      const finder = savedObjectsClient.createPointInTimeFinder({
        type: KibanaSavedObjectType.workflow,
        filter: `${KibanaSavedObjectType.workflow}.attributes.managed: true AND ${KibanaSavedObjectType.workflow}.attributes.managedBy: ${pkgName}`,
        perPage: 100,
      });
      for await (const soPage of finder.find()) {
        for (const so of soPage.saved_objects) {
          if (so.id.startsWith(managedWorkflowPrefix) && !newAssetIds.has(so.id)) {
            logger.info(
              `FLEET-012: removing orphaned workflow ${so.id} (no longer in package archive)`
            );
            await savedObjectsClient.delete(KibanaSavedObjectType.workflow, so.id);
          }
        }
      }
      await finder.close();
    } catch (err) {
      logger.warn(`FLEET-012: failed to reconcile removed workflows: ${err}`);
    }
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
