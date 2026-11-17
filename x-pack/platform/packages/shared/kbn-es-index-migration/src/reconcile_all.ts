/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reconcile } from './reconcile';
import { describeEsRefusal } from './es_errors';
import { sortedVersionNumbers } from './define_migration';
import { namespacesFor, resolveName } from './resource';
import { recordSweep } from './metrics';
import type { ReconcileAllOptions, ReconcileResult } from './types';

/**
 * Reconciles one migration across every namespace.
 *
 * Sequential rather than parallel: namespaces are independent indices, but a migration
 * is never latency-sensitive and a hundred spaces reconciling at once would be a load
 * spike for no benefit.
 *
 * One namespace cannot stop the others. A space whose index is in a bad state should not
 * leave every other space un-migrated, so a failure is recorded against that namespace
 * and the sweep continues.
 */
export const reconcileAll = async ({
  definition,
  esClient,
  logger,
  namespaces,
  signal,
}: ReconcileAllOptions): Promise<ReconcileResult[]> => {
  const declared = sortedVersionNumbers(definition.versions);
  const target = declared.length > 0 ? declared[declared.length - 1] : definition.baseline;
  const results: ReconcileResult[] = [];
  const startedAt = Date.now();

  // A global resource is one index however many spaces exist, so it collapses to a
  // single pass rather than repeating the same no-op per namespace.
  const targets = namespacesFor(definition.resource, namespaces);

  for (const namespace of targets) {
    if (signal?.aborted) {
      logger.info(`[${definition.id}] aborted after ${results.length}/${targets.length}`);
      return results;
    }

    try {
      results.push(await reconcile({ definition, esClient, logger, namespace, signal }));
    } catch (error) {
      // `reconcile` already turns an Elasticsearch refusal into a failed result, so
      // reaching here means something unanticipated - still not a reason to abandon the
      // remaining namespaces.
      const message = describeEsRefusal(error);
      logger.error(`[${definition.id}] ${namespace} threw unexpectedly: ${message}`);
      results.push({
        migrationId: definition.id,
        resourceName: resolveName(definition.resource, namespace),
        namespace,
        status: 'failed',
        installed: definition.baseline,
        target,
        applied: [],
        error: message,
      });
    }
  }

  const failed = results.filter(({ status }) => status === 'failed');
  if (failed.length > 0) {
    logger.warn(
      `[${definition.id}] ${failed.length}/${results.length} spaces failed: ` +
        failed.map(({ namespace }) => namespace).join(', ')
    );
  }

  if (results.length > 0) {
    recordSweep(definition.id, definition.execution, (Date.now() - startedAt) / 1000, results);
  }

  return results;
};
