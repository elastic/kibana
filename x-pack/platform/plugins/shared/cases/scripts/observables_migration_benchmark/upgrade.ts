/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import { logger } from '../cases_generator/logger';
import { ALERTING_CASES_INDEX, RuleWriteProbe } from '../observables_load_test/probe';
import type { Requester } from '../observables_load_test/shared';
import { formatTable, latencyRow } from '../observables_load_test/shared';
import type { LatencyStats } from '../observables_load_test/stats';
import { delay, summarize, timed } from '../observables_load_test/stats';
import type { BenchmarkConfig } from './config';
import {
  countBelowVersion,
  findProbeRuleId,
  getByQueryTasks,
  getIndexStats,
  getNodeStats,
  getTypeVersionCounts,
} from './es_stats';
import type { ByQueryTask, IndexStats, NodeStats } from './es_stats';
import type { MetadataCheck, MetadataWrites } from './metadata_writes';
import { checkMetadata, metadataFor, sampleObservables, writeMetadata } from './metadata_writes';
import type { MigrationLog, MigrationPhase } from './migration_log';
import { parseMigrationLog, phaseOf, phaseSeconds } from './migration_log';

export const PROBE_TAG = 'observables-upgrade-benchmark';

type KibanaLevel = 'available' | 'unavailable' | 'down';
type IntervalPhase = MigrationPhase | 'serving while outdated' | 'serving';

interface UpgradeInterval {
  at: string;
  elapsedSeconds: number;
  kibana: KibanaLevel;
  phase: IntervalPhase;
  states: Array<string | undefined>;
  versions: Record<string, number>;
  belowTarget: number;
  migratedPerSecond: number;
  byQuery: ByQueryTask[];
  index?: IndexStats;
  node?: NodeStats;
  ruleWrite: LatencyStats;
  ruleWriteErrors: number;
  caseFindMs?: number;
}

interface TrackedTask {
  action: string;
  description?: string;
  total: number;
  updated: number;
  versionConflicts: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

const kibanaLevel = async (request: Requester): Promise<KibanaLevel> => {
  try {
    const status = await request<{ status: { overall: { level: string } } }>('GET', '/api/status');
    return status.status.overall.level === 'available' ? 'available' : 'unavailable';
  } catch {
    return 'down';
  }
};

const orUndefined = <T>(promise: Promise<T>): Promise<T | undefined> =>
  promise.catch(() => undefined);

const groupPush = (groups: Record<string, number[]>, key: string, values: number[]) => {
  groups[key] = [...(groups[key] ?? []), ...values];
};

const summarizeLog = (log: MigrationLog) => ({
  file: log.file,
  firstLineAt: log.firstLineAt,
  starts: log.starts,
  documentsToProcess: log.documentsToProcess,
  migrationCompletedMs: log.migrationCompletedMs,
  allMigrationsCompletedMs: log.allMigrationsCompletedMs,
  rewriteSeconds: phaseSeconds(log, 'rewrite'),
  pickupSeconds: phaseSeconds(log, 'pickup'),
  phases: { rewrite: log.phases.rewrite, pickup: log.phases.pickup },
  pickupRetries: log.pickupRetries,
  errorLines: log.errorLines,
  migratorShutdown: log.migratorShutdown,
});

/**
 * Follows a saved-object model version upgrade of `cases-attachments` from before Kibana starts
 * until every document is at the target version: the migration steps from the Kibana logs, docs
 * per version, the mappings pickup tasks, index growth, node load, and rule write latency on the
 * shared index the whole time (written to Elasticsearch directly, so it runs while Kibana is down).
 */
export const runUpgrade = async (
  es: Client,
  request: Requester,
  config: BenchmarkConfig
): Promise<void> => {
  const { targetVersion, kibanaLog: logFiles } = config;
  fs.mkdirSync(config.out, { recursive: true });
  const linesPath = path.join(config.out, `upgrade-${config.label}.jsonl`);
  const summaryPath = path.join(config.out, `upgrade-${config.label}-summary.json`);
  fs.writeFileSync(linesPath, '');

  const watchStartedAt = Date.now();
  for (;;) {
    if (await es.ping().catch(() => false)) {
      break;
    }
    logger.info('Waiting for Elasticsearch');
    await delay(2_000);
  }

  const initialVersions = await getTypeVersionCounts(es);
  const initialIndex = await getIndexStats(es);
  logger.info(`Initial cases-attachments versions ${JSON.stringify(initialVersions)}`);

  const ruleId = await findProbeRuleId(es, PROBE_TAG);
  if (ruleId == null) {
    logger.warning(`No probe rule tagged ${PROBE_TAG}; run --mode prepare first. No rule writes.`);
  }
  const probe = ruleId != null ? new RuleWriteProbe(es, ruleId, config.probeIntervalMs) : undefined;

  const intervals: UpgradeInterval[] = [];
  const ruleWriteByPhase: Record<string, number[]> = {};
  const caseFindByPhase: Record<string, number[]> = {};
  const tasks = new Map<string, TrackedTask>();
  let ruleWriteErrors = 0;
  let peakConcurrentByQuery = 0;
  let previous = { at: Date.now(), belowTarget: countBelowVersion(initialVersions, targetVersion) };
  let kibanaAvailableAt: number | undefined;
  let metadataDuring:
    | Promise<{ writes: MetadataWrites; startedAt: string; finishedAt: string }>
    | undefined;

  probe?.start();
  try {
    for (;;) {
      await delay(config.intervalSeconds * 1_000);
      const at = Date.now();
      const [versions, byQuery, index, node, kibana] = await Promise.all([
        orUndefined(getTypeVersionCounts(es)),
        orUndefined(getByQueryTasks(es)),
        orUndefined(getIndexStats(es)),
        orUndefined(getNodeStats(es)),
        kibanaLevel(request),
      ]);
      const logs = logFiles.map((file) => parseMigrationLog(file, ALERTING_CASES_INDEX));
      const belowTarget =
        versions != null ? countBelowVersion(versions, targetVersion) : previous.belowTarget;

      if (kibana === 'available') {
        kibanaAvailableAt ??= at;
      }
      const [firstLog] = logs;
      const phase: IntervalPhase =
        kibana === 'available'
          ? belowTarget > 0
            ? 'serving while outdated'
            : 'serving'
          : firstLog?.lastState != null
          ? phaseOf(firstLog.lastState)
          : 'other';

      const caseFind =
        kibana === 'available'
          ? await orUndefined(
              timed(() =>
                request(
                  'GET',
                  `/api/cases/_find?owner=${config.owner}&perPage=20&sortField=createdAt`
                )
              )
            )
          : undefined;

      for (const task of byQuery ?? []) {
        const tracked = tasks.get(task.id);
        tasks.set(task.id, {
          action: task.action,
          description: task.description,
          total: Math.max(tracked?.total ?? 0, task.total),
          updated: Math.max(tracked?.updated ?? 0, task.updated),
          versionConflicts: Math.max(tracked?.versionConflicts ?? 0, task.versionConflicts),
          firstSeenAt: tracked?.firstSeenAt ?? at - task.runningSeconds * 1_000,
          lastSeenAt: at,
        });
      }
      peakConcurrentByQuery = Math.max(peakConcurrentByQuery, byQuery?.length ?? 0);

      if (
        config.zdt &&
        config.metadataWritesDuring > 0 &&
        metadataDuring == null &&
        kibana === 'available' &&
        belowTarget >= config.metadataWritesDuring * 10
      ) {
        logger.info(`Writing metadata on ${config.metadataWritesDuring} outdated observables`);
        metadataDuring = (async () => {
          const startedAt = new Date().toISOString();
          const observables = await sampleObservables(es, config.metadataWritesDuring, {
            belowVersion: targetVersion,
          });
          const writes = await writeMetadata(request, observables, metadataFor);
          logger.info(`Wrote metadata on ${writes.written} observables (${writes.failed} failed)`);
          return { writes, startedAt, finishedAt: new Date().toISOString() };
        })();
      }

      const drained = probe?.drain() ?? { samples: [], errors: 0 };
      ruleWriteErrors += drained.errors;
      groupPush(ruleWriteByPhase, phase, drained.samples);
      if (caseFind != null) {
        groupPush(caseFindByPhase, phase, [caseFind.ms]);
      }

      const interval: UpgradeInterval = {
        at: new Date(at).toISOString(),
        elapsedSeconds: Math.round((at - watchStartedAt) / 1000),
        kibana,
        phase,
        states: logs.map(({ lastState }) => lastState),
        versions: versions ?? {},
        belowTarget,
        migratedPerSecond: Math.round(
          ((previous.belowTarget - belowTarget) * 1000) / (at - previous.at)
        ),
        byQuery: byQuery ?? [],
        index,
        node,
        ruleWrite: summarize(drained.samples),
        ruleWriteErrors: drained.errors,
        caseFindMs: caseFind != null ? Math.round(caseFind.ms) : undefined,
      };
      intervals.push(interval);
      fs.appendFileSync(linesPath, `${JSON.stringify(interval)}\n`);
      const pickup = interval.byQuery.map(({ updated, total }) => `${updated}/${total}`).join(', ');
      logger.info(
        `${interval.elapsedSeconds}s: Kibana ${kibana}, ${phase} (${
          interval.states.join(' | ') || 'no log'
        }), ${belowTarget} below ${targetVersion} (${interval.migratedPerSecond}/s)${
          pickup ? `, by query ${pickup}` : ''
        }, store ${Math.round((index?.storeBytes ?? 0) / 2 ** 20)} MiB, deleted ${
          index?.deletedDocs ?? '?'
        }, ES CPU ${node?.cpuPercent ?? '?'}%, rule write p95 ${interval.ruleWrite.p95} ms${
          interval.caseFindMs != null ? `, case _find ${interval.caseFindMs} ms` : ''
        }`
      );
      previous = { at, belowTarget };

      if (kibana === 'available' && belowTarget === 0 && (byQuery?.length ?? 1) === 0) {
        break;
      }
      if (at - watchStartedAt > config.maxMinutes * 60_000) {
        logger.warning(`Stopping after ${config.maxMinutes} minutes without completion`);
        break;
      }
    }
  } finally {
    await probe?.stop();
  }

  let metadata:
    | {
        writes: Omit<MetadataWrites, 'observables' | 'metadata'>;
        check: MetadataCheck;
        startedAt: string;
        finishedAt: string;
      }
    | undefined;
  if (metadataDuring != null) {
    const { writes, startedAt, finishedAt } = await metadataDuring;
    const { observables, metadata: written, ...rest } = writes;
    metadata = {
      writes: rest,
      startedAt,
      finishedAt,
      check: await checkMetadata(es, observables, written),
    };
  }

  const logs = logFiles.map((file) => parseMigrationLog(file, ALERTING_CASES_INDEX));
  const firstLineAt = logs.find(({ firstLineAt: lineAt }) => lineAt != null)?.firstLineAt;
  const kibanaStartedAt = firstLineAt != null ? Date.parse(firstLineAt) : watchStartedAt;
  const rewriteSeconds = logs.reduce((sum, log) => sum + phaseSeconds(log, 'rewrite'), 0);
  const pickupSeconds = logs.reduce((sum, log) => sum + phaseSeconds(log, 'pickup'), 0);
  const rewriteDocuments = logs
    .flatMap(({ documentsToProcess }) => documentsToProcess)
    .reduce((sum, count) => sum + count, 0);
  const trackedTasks = [...tasks.entries()].map(([id, task]) => ({
    id,
    ...task,
    seconds: Math.round((task.lastSeenAt - task.firstSeenAt) / 1000),
    updatedPerSecond: Math.round(
      (task.updated * 1000) / Math.max(1, task.lastSeenAt - task.firstSeenAt)
    ),
    firstSeenAt: new Date(task.firstSeenAt).toISOString(),
    lastSeenAt: new Date(task.lastSeenAt).toISOString(),
  }));
  const cpu = intervals.flatMap(({ node }) => (node != null ? [node.cpuPercent] : []));
  const final = intervals[intervals.length - 1];

  const summary = {
    label: config.label,
    zdt: config.zdt,
    targetVersion,
    watchStartedAt: new Date(watchStartedAt).toISOString(),
    kibanaFirstLogLineAt: firstLineAt,
    kibanaAvailableAt:
      kibanaAvailableAt != null ? new Date(kibanaAvailableAt).toISOString() : undefined,
    kibanaUnavailableSeconds:
      kibanaAvailableAt != null
        ? Math.round((kibanaAvailableAt - kibanaStartedAt) / 1000)
        : undefined,
    completedSeconds:
      final != null ? Math.round((Date.parse(final.at) - kibanaStartedAt) / 1000) : undefined,
    rewrite: {
      seconds: rewriteSeconds,
      documents: rewriteDocuments,
      documentsPerSecond:
        rewriteSeconds > 0 ? Math.round(rewriteDocuments / rewriteSeconds) : undefined,
    },
    pickup: {
      seconds: pickupSeconds,
      retries: logs.reduce((sum, { pickupRetries }) => sum + pickupRetries, 0),
      tasks: trackedTasks,
      peakConcurrentByQuery,
    },
    logs: logs.map(summarizeLog),
    versions: { initial: initialVersions, final: final?.versions },
    index: {
      initial: initialIndex,
      peakStoreBytes: Math.max(0, ...intervals.map(({ index }) => index?.storeBytes ?? 0)),
      peakDeletedDocs: Math.max(0, ...intervals.map(({ index }) => index?.deletedDocs ?? 0)),
      final: final?.index,
    },
    elasticsearchCpuPercent: summarize(cpu),
    elasticsearchHeapPercentMax: Math.max(
      0,
      ...intervals.map(({ node }) => node?.heapPercent ?? 0)
    ),
    ruleWrite: {
      errors: ruleWriteErrors,
      byPhase: Object.fromEntries(
        Object.entries(ruleWriteByPhase).map(([phase, samples]) => [phase, summarize(samples)])
      ),
    },
    caseFind: Object.fromEntries(
      Object.entries(caseFindByPhase).map(([phase, samples]) => [phase, summarize(samples)])
    ),
    metadataDuringMigration: metadata,
    intervals: intervals.length,
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  logger.info(
    `Upgrade\n${formatTable({
      upgrade: {
        'Kibana unavailable s': summary.kibanaUnavailableSeconds ?? '',
        'done after s': summary.completedSeconds ?? '',
        'rewrite s': rewriteSeconds,
        'rewrite docs': rewriteDocuments,
        'rewrite docs/s': summary.rewrite.documentsPerSecond ?? '',
        'pickup s': pickupSeconds,
        'pickup retries': summary.pickup.retries,
        'peak by query': peakConcurrentByQuery,
        'peak store MiB': Math.round(summary.index.peakStoreBytes / 2 ** 20),
        'peak deleted docs': summary.index.peakDeletedDocs,
      },
    })}`
  );
  logger.info(
    `Rule status write by phase\n${formatTable(
      Object.fromEntries(
        Object.entries(summary.ruleWrite.byPhase).map(([phase, stats]) => [
          phase,
          latencyRow(stats),
        ])
      )
    )}`
  );
  if (metadata != null) {
    logger.info(`Metadata written during the migration\n${formatTable({ check: metadata.check })}`);
  }
  logger.success(`Upgrade written to ${linesPath} and ${summaryPath}`);
};
