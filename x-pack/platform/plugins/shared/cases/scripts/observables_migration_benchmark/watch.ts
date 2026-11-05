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
import { RuleWriteProbe } from '../observables_load_test/probe';
import type { Requester } from '../observables_load_test/shared';
import { createProbeRule, formatTable, latencyRow } from '../observables_load_test/shared';
import type { LatencyStats } from '../observables_load_test/stats';
import { delay, summarize, timed } from '../observables_load_test/stats';
import type { BenchmarkConfig } from './config';
import {
  countObservableAttachments,
  getIndexStats,
  getMigrationTask,
  getObjectCounts,
} from './es_stats';
import type { IndexStats, MigrationTask, ObjectCounts } from './es_stats';

const TAG = 'observables-migration-benchmark';

interface Interval {
  at: string;
  elapsedSeconds: number;
  attachments: number;
  attachmentsPerSecond: number;
  taskStatus?: string;
  taskRuns?: number;
  taskComplete: boolean;
  index: IndexStats;
  ruleWrite: LatencyStats;
  ruleWriteErrors: number;
  caseFindMs?: number;
}

const waitFor = async (what: string, check: () => Promise<boolean>): Promise<number> => {
  logger.info(`Waiting for ${what}`);
  for (;;) {
    try {
      if (await check()) {
        return Date.now();
      }
    } catch {
      // not ready yet
    }
    await delay(2_000);
  }
};

const median = (values: number[]): number => summarize(values).p50;

/**
 * Follows the migration from Kibana start to its completion: attachment count and rate, the task
 * state, index growth, rule write latency and case list latency, one line per interval.
 */
export const runWatch = async (
  es: Client,
  request: Requester,
  config: BenchmarkConfig
): Promise<void> => {
  fs.mkdirSync(config.out, { recursive: true });
  const linesPath = path.join(config.out, `watch-${config.label}.jsonl`);
  const summaryPath = path.join(config.out, `watch-${config.label}-summary.json`);
  fs.writeFileSync(linesPath, '');

  const watchStartedAt = Date.now();
  await waitFor('Elasticsearch', async () => (await es.ping()) === true);
  const initial: { index: IndexStats; counts: ObjectCounts } = {
    index: await getIndexStats(es),
    counts: await getObjectCounts(es),
  };
  logger.info(`Initial ${JSON.stringify(initial)}`);

  const kibanaAvailableAt = await waitFor('Kibana', async () => {
    const status = await request<{ status: { overall: { level: string } } }>('GET', '/api/status');
    return status.status.overall.level === 'available';
  });

  const rule = await createProbeRule(request, TAG);
  const probe = new RuleWriteProbe(es, rule.id, config.probeIntervalMs);
  const ruleWriteSamples: number[] = [];
  let ruleWriteErrors = 0;
  const intervals: Interval[] = [];
  let previous = { at: Date.now(), attachments: await countObservableAttachments(es) };
  let task: MigrationTask | undefined;

  probe.start();
  try {
    for (;;) {
      await delay(config.intervalSeconds * 1_000);
      const at = Date.now();
      const [currentTask, attachments, index, caseFind] = await Promise.all([
        getMigrationTask(es),
        countObservableAttachments(es),
        getIndexStats(es),
        timed(() =>
          request('GET', `/api/cases/_find?owner=${config.owner}&perPage=20&sortField=createdAt`)
        ).catch(() => undefined),
      ]);
      task = currentTask;
      const drained = probe.drain();
      ruleWriteSamples.push(...drained.samples);
      ruleWriteErrors += drained.errors;

      const interval: Interval = {
        at: new Date(at).toISOString(),
        elapsedSeconds: Math.round((at - kibanaAvailableAt) / 1000),
        attachments,
        attachmentsPerSecond: Math.round(
          ((attachments - previous.attachments) * 1000) / (at - previous.at)
        ),
        taskStatus: task?.status,
        taskRuns: task?.state.runs,
        taskComplete: task?.state.complete === true,
        index,
        ruleWrite: summarize(drained.samples),
        ruleWriteErrors: drained.errors,
        caseFindMs: caseFind != null ? Math.round(caseFind.ms) : undefined,
      };
      intervals.push(interval);
      fs.appendFileSync(linesPath, `${JSON.stringify(interval)}\n`);
      logger.info(
        `${interval.elapsedSeconds}s: ${attachments} attachments (${
          interval.attachmentsPerSecond
        }/s), task ${interval.taskStatus ?? 'missing'} run ${
          interval.taskRuns ?? 0
        }, rule write p95 ${interval.ruleWrite.p95} ms, case _find ${
          interval.caseFindMs ?? 'failed'
        } ms`
      );
      previous = { at, attachments };

      if (interval.taskComplete) {
        break;
      }
      if (at - watchStartedAt > config.maxMinutes * 60_000) {
        logger.warning(`Stopping after ${config.maxMinutes} minutes without completion`);
        break;
      }
    }
  } finally {
    await probe.stop();
    await request('DELETE', `/api/alerting/rule/${rule.id}`).catch((error) =>
      logger.warning(`Could not delete the probe rule ${rule.id}: ${error}`)
    );
  }

  const state = task?.state;
  const wallMs =
    state?.startedAt != null && state.completedAt != null
      ? Date.parse(state.completedAt) - Date.parse(state.startedAt)
      : undefined;
  const busyRates = intervals
    .map(({ attachmentsPerSecond }) => attachmentsPerSecond)
    .filter((rate) => rate > 0);
  const final = intervals[intervals.length - 1];
  const summary = {
    label: config.label,
    watchStartedAt: new Date(watchStartedAt).toISOString(),
    kibanaAvailableAt: new Date(kibanaAvailableAt).toISOString(),
    kibanaStartSeconds: Math.round((kibanaAvailableAt - watchStartedAt) / 1000),
    task: state,
    backfill: {
      wallSeconds: wallMs != null ? Math.round(wallMs / 1000) : undefined,
      observablesPerSecond:
        wallMs != null && state?.totals != null
          ? Math.round((state.totals.observables * 1000) / wallMs)
          : undefined,
      intervalAttachmentsPerSecondP50: median(busyRates),
      intervalAttachmentsPerSecondMax: Math.max(0, ...busyRates),
    },
    ruleWriteDuringBackfill: { latency: summarize(ruleWriteSamples), errors: ruleWriteErrors },
    caseFindDuringBackfill: summarize(
      intervals.flatMap(({ caseFindMs }) => (caseFindMs != null ? [caseFindMs] : []))
    ),
    index: { initial: initial.index, final: final?.index },
    initialCounts: initial.counts,
    intervals: intervals.length,
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  logger.info(`Backfill\n${formatTable({ backfill: summary.backfill })}`);
  logger.info(
    `Rule status write during the backfill\n${formatTable({
      backfill: { ...latencyRow(summary.ruleWriteDuringBackfill.latency), errors: ruleWriteErrors },
    })}`
  );
  logger.success(`Watch written to ${linesPath} and ${summaryPath}`);
};
