/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortedVersionNumbers } from './define_migration';
import { indexExists, readVersion } from './backends/index_backend';
import { namespacesFor, resolveName } from './resource';
import type { LastRun, MigrationStatus, NamespaceStatus, StatusOptions } from './types';

/**
 * Reports where a migration actually stands, per namespace.
 *
 * Derived from Elasticsearch each time rather than cached, because the index is the only
 * thing that knows what was applied to it - and the whole problem this library exists for
 * is that nobody was asking it.
 *
 * Uniform across execution modes: the mode decides who pulls the trigger, never what is
 * visible.
 */
export const getMigrationStatus = async ({
  definition,
  esClient,
  namespaces,
  lastRun,
  signal,
}: StatusOptions): Promise<MigrationStatus> => {
  const { id, resource, baseline, execution, versions } = definition;
  const declared = sortedVersionNumbers(versions);
  const target = declared.length > 0 ? declared[declared.length - 1] : baseline;

  const perNamespace: NamespaceStatus[] = [];

  // One entry for a global resource, not the same index repeated per space.
  for (const namespace of namespacesFor(resource, namespaces)) {
    const resourceName = resolveName(resource, namespace);
    const exists = await indexExists(esClient, resourceName, { signal });
    const installed = exists
      ? (await readVersion(esClient, resourceName, { signal })) ?? baseline
      : undefined;

    perNamespace.push({
      namespace,
      resourceName,
      exists,
      installed,
      versionsBehind: installed === undefined ? target : Math.max(0, target - installed),
    });
  }

  return {
    migrationId: id,
    execution,
    target,
    namespaces: perNamespace,
    versionsBehind: perNamespace.reduce((worst, ns) => Math.max(worst, ns.versionsBehind), 0),
    ...describeLastRun(definition.execution, lastRun),
  };
};

/**
 * Says explicitly whether a last-run record could exist, not just whether one did.
 *
 * Only `auto` persists its outcome, because it is the only mode that runs with nobody
 * there to receive the result. Without this distinction a blank error field on a
 * `lifecycle` migration reads as "it succeeded" when it actually means "we never kept a
 * record" - the error is in the plugin's own startup logs.
 */
const describeLastRun = (
  execution: MigrationStatus['execution'],
  lastRun: LastRun | undefined
): Pick<MigrationStatus, 'lastRun' | 'lastRunRecorded'> => {
  if (execution !== 'auto') {
    return { lastRunRecorded: 'not_applicable', lastRun: undefined };
  }
  return lastRun
    ? { lastRunRecorded: 'yes', lastRun }
    : { lastRunRecorded: 'never_run', lastRun: undefined };
};
