/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { isValidDataset, sanitizeDataset } from '../../../common/services';
import { DATASET_VAR_NAME } from '../../../common/constants';
import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS } from '../../constants';

import { appContextService, packagePolicyService } from '../../services';
import type { PackagePolicy } from '../../types';
import { runWithCache } from '../../services/epm/packages/cache';
import { getSpaceForPackagePolicy } from '../../services/spaces/helpers';

import { throwIfAborted } from '../utils';

interface Finding {
  policyId: string;
  spaceId: string;
  packageName: string;
  packageVersion: string;
  inputIndex: number;
  streamIndex: number;
  streamDataset: string;
  dataStreamType: string;
  oldValue: string;
  newValue: string | undefined;
  inputEnabled: boolean;
  streamEnabled: boolean;
  isManaged: boolean;
}

type Outcome =
  | 'updated'
  | 'skipped:collision_sanitized'
  | 'skipped:collision_existing'
  | 'skipped:managed'
  | 'skipped:unfixable'
  | 'failed:update'
  | 'would_update';

interface FindingWithOutcome extends Finding {
  outcome: Outcome;
  error?: string;
}

interface RemediationReport {
  mode: 'report' | 'apply';
  scanned: number;
  found: number;
  updated: number;
  skippedCollision: number;
  skippedManaged: number;
  unfixable: number;
  failed: number;
  findings: FindingWithOutcome[];
}

export async function runRemediateInvalidDatasets(params: {
  signal: AbortSignal;
  logger: Logger;
}): Promise<RemediationReport> {
  const { signal, logger } = params;
  const mode =
    (appContextService.getConfig()?.internal?.invalidDatasetRemediation as 'report' | 'apply') ??
    'report';
  const esClient = appContextService.getInternalUserESClient();
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  return _runRemediateInvalidDatasets({ soClient, esClient, signal, logger, mode });
}

export async function _runRemediateInvalidDatasets(params: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  signal: AbortSignal;
  logger: Logger;
  mode: 'report' | 'apply';
}): Promise<RemediationReport> {
  const { soClient, esClient, signal, logger, mode } = params;

  return runWithCache(async () => {
    // Phase A: scan — collect all findings across all spaces
    const findings: Finding[] = [];
    // Track all (dataStreamType, datasetValue) pairs that are currently valid in any policy,
    // to detect collisions with already-used dataset names.
    const existingDatasets = new Set<string>();
    let scanned = 0;

    logger.info(`[remediateInvalidDatasets] Starting scan in mode=${mode}`);

    for await (const batch of await packagePolicyService.fetchAllItems(soClient, {
      spaceIds: ['*'],
      perPage: 1000,
    })) {
      throwIfAborted(signal);
      scanned += batch.length;

      for (const policy of batch) {
        for (let inputIndex = 0; inputIndex < policy.inputs.length; inputIndex++) {
          const input = policy.inputs[inputIndex];
          for (let streamIndex = 0; streamIndex < (input.streams ?? []).length; streamIndex++) {
            const stream = input.streams[streamIndex];
            const rawValue = stream.vars?.[DATASET_VAR_NAME]?.value;

            if (typeof rawValue !== 'string' || !rawValue) {
              continue;
            }

            const dataStreamType = stream.data_stream?.type ?? 'logs';

            // Track valid datasets so we can detect collision:existing
            if (isValidDataset(rawValue, false).valid) {
              existingDatasets.add(`${dataStreamType}:${rawValue}`);
              continue;
            }

            const newValue = sanitizeDataset(rawValue);
            findings.push({
              policyId: policy.id,
              spaceId: getSpaceForPackagePolicy(policy),
              packageName: policy.package?.name ?? '',
              packageVersion: policy.package?.version ?? '',
              inputIndex,
              streamIndex,
              streamDataset: stream.data_stream?.dataset ?? '',
              dataStreamType,
              oldValue: rawValue,
              newValue,
              inputEnabled: input.enabled !== false,
              streamEnabled: stream.enabled !== false,
              isManaged: policy.is_managed ?? false,
            });
          }
        }
      }
    }

    logger.info(
      `[remediateInvalidDatasets] Scan complete: scanned=${scanned} found=${findings.length}`
    );

    // Phase B: classify
    // Detect sanitized-value collisions: different oldValues map to the same (type, newValue)
    const sanitizedKeyToOldValues = new Map<string, string[]>();
    for (const f of findings) {
      if (!f.newValue) continue;
      const key = `${f.dataStreamType}:${f.newValue}`;
      const existing = sanitizedKeyToOldValues.get(key) ?? [];
      if (!existing.includes(f.oldValue)) {
        existing.push(f.oldValue);
      }
      sanitizedKeyToOldValues.set(key, existing);
    }

    const collisionSanitized = new Set<string>(
      [...sanitizedKeyToOldValues.entries()]
        .filter(([, oldValues]) => oldValues.length > 1)
        .map(([key]) => key)
    );

    const classifiedFindings: FindingWithOutcome[] = findings.map((f) => {
      if (f.isManaged) {
        return { ...f, outcome: 'skipped:managed' };
      }
      if (!f.newValue) {
        return { ...f, outcome: 'skipped:unfixable' };
      }
      const sanitizedKey = `${f.dataStreamType}:${f.newValue}`;
      if (collisionSanitized.has(sanitizedKey)) {
        return { ...f, outcome: 'skipped:collision_sanitized' };
      }
      if (existingDatasets.has(sanitizedKey)) {
        return { ...f, outcome: 'skipped:collision_existing' };
      }
      return { ...f, outcome: mode === 'apply' ? 'updated' : 'would_update' };
    });

    // Phase C: apply (only in apply mode)
    if (mode === 'apply') {
      // Group eligible findings by policyId (a policy may have multiple invalid streams)
      const eligibleByPolicyId = new Map<string, FindingWithOutcome[]>();
      for (const f of classifiedFindings) {
        if (f.outcome === 'updated') {
          const list = eligibleByPolicyId.get(f.policyId) ?? [];
          list.push(f);
          eligibleByPolicyId.set(f.policyId, list);
        }
      }

      // Load the full policies for eligible ids in one pass
      const eligibleIds = [...eligibleByPolicyId.keys()];
      const policiesToFix =
        eligibleIds.length > 0
          ? await packagePolicyService.getByIDs(soClient, eligibleIds, { spaceIds: ['*'] })
          : [];

      const policyMap = new Map<string, PackagePolicy>(policiesToFix.map((p) => [p.id, p]));

      await pMap(
        [...eligibleByPolicyId.entries()],
        async ([policyId, policyFindings]) => {
          throwIfAborted(signal);

          const policy = policyMap.get(policyId);
          if (!policy) {
            for (const f of policyFindings) {
              const idx = classifiedFindings.findIndex((cf) => cf === f);
              if (idx !== -1) {
                classifiedFindings[idx] = {
                  ...f,
                  outcome: 'failed:update',
                  error: 'Policy not found during apply phase',
                };
              }
            }
            return;
          }

          // Clone the policy inputs with the sanitized dataset values substituted
          const updatedInputs = policy.inputs.map((input, iIdx) => ({
            ...input,
            streams: (input.streams ?? []).map((stream, sIdx) => {
              const finding = policyFindings.find(
                (f) => f.inputIndex === iIdx && f.streamIndex === sIdx
              );
              if (!finding || !finding.newValue) return stream;
              return {
                ...stream,
                vars: {
                  ...stream.vars,
                  [DATASET_VAR_NAME]: {
                    ...stream.vars?.[DATASET_VAR_NAME],
                    value: finding.newValue,
                  },
                },
              };
            }),
          }));

          const spaceScopedClient = appContextService.getInternalUserSOClientForSpaceId(
            getSpaceForPackagePolicy(policy)
          );

          try {
            await packagePolicyService.update(
              spaceScopedClient,
              esClient,
              policyId,
              {
                name: policy.name,
                enabled: policy.enabled,
                policy_ids: policy.policy_ids,
                inputs: updatedInputs,
                namespace: policy.namespace,
                vars: policy.vars,
                package: policy.package,
                description: policy.description,
              },
              {
                allowDatasetChange: true,
                force: true,
                skipUniqueNameVerification: true,
              }
            );
          } catch (updateError) {
            logger.error(
              `[remediateInvalidDatasets] Failed to update policy ${policyId}: ${updateError.message}`
            );
            for (const f of policyFindings) {
              const idx = classifiedFindings.findIndex((cf) => cf === f);
              if (idx !== -1) {
                classifiedFindings[idx] = {
                  ...f,
                  outcome: 'failed:update',
                  error: updateError.message,
                };
              }
            }
          }
        },
        { concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS }
      );
    }

    // Phase D: report
    const updated = classifiedFindings.filter((f) => f.outcome === 'updated').length;
    const skippedCollision = classifiedFindings.filter(
      (f) =>
        f.outcome === 'skipped:collision_sanitized' || f.outcome === 'skipped:collision_existing'
    ).length;
    const skippedManaged = classifiedFindings.filter((f) => f.outcome === 'skipped:managed').length;
    const unfixable = classifiedFindings.filter((f) => f.outcome === 'skipped:unfixable').length;
    const failed = classifiedFindings.filter((f) => f.outcome === 'failed:update').length;

    const report: RemediationReport = {
      mode,
      scanned,
      found: findings.length,
      updated,
      skippedCollision,
      skippedManaged,
      unfixable,
      failed,
      findings: classifiedFindings,
    };

    logger.info(
      `[remediateInvalidDatasets] Report: mode=${mode} scanned=${scanned} found=${findings.length} ` +
        `updated=${updated} skippedCollision=${skippedCollision} skippedManaged=${skippedManaged} ` +
        `unfixable=${unfixable} failed=${failed}`
    );

    for (const f of classifiedFindings) {
      logger.info(
        `[remediateInvalidDatasets] Finding: policy=${f.policyId} space=${f.spaceId} ` +
          `package=${f.packageName} old=${f.oldValue} new=${f.newValue ?? '(none)'} ` +
          `outcome=${f.outcome}${f.error ? ` error=${f.error}` : ''}`
      );
    }

    return report;
  });
}
