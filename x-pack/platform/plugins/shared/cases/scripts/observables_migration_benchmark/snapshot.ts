/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { chunk } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import { deriveObservableId } from '../../server/client/cases/observables_storage';
import { logger } from '../cases_generator/logger';
import { ALERTING_CASES_INDEX, RuleWriteProbe } from '../observables_load_test/probe';
import type { ProbeResult } from '../observables_load_test/probe';
import type { Requester } from '../observables_load_test/shared';
import { createProbeRule, formatTable, latencyRow } from '../observables_load_test/shared';
import type { LatencyStats } from '../observables_load_test/stats';
import { delay, sample, timed } from '../observables_load_test/stats';
import type { BenchmarkConfig } from './config';
import {
  getIndexStats,
  getMigrationTask,
  getObjectCounts,
  HAS_FIELD_OBSERVABLES,
} from './es_stats';
import type { IndexStats, MigrationTask, ObjectCounts } from './es_stats';

const TAG = 'observables-migration-benchmark';
const FORCE_MERGE_TIMEOUT_MS = 4 * 60 * 60 * 1000;
const MGET_CHUNK = 5_000;

interface FieldObservable {
  id?: string;
  typeKey?: string;
  value?: string;
}

interface SampledCase {
  id: string;
  observables: FieldObservable[];
}

interface Verification {
  cases: number;
  fieldObservables: number;
  distinctObservables: number;
  missing: number;
  legacyIdMismatch: number;
  missingExamples: string[];
}

interface Reads {
  latency: Record<string, LatencyStats>;
  ruleWrite: ProbeResult;
  checks: Record<string, number | string | null>;
}

interface SnapshotReport {
  label: string;
  takenAt: string;
  forceMergeSeconds?: number;
  index: IndexStats;
  counts: ObjectCounts;
  task?: MigrationTask;
  verification?: Verification;
  reads?: Reads;
}

/** A reproducible random sample of cases that hold observables in their field. */
const sampleCases = async (es: Client, size: number, owner?: string): Promise<SampledCase[]> => {
  const response = await es.search<{ cases?: { observables?: FieldObservable[] } }>({
    index: ALERTING_CASES_INDEX,
    size,
    _source: ['cases.observables'],
    query: {
      function_score: {
        query: {
          bool: {
            filter: [
              { term: { type: 'cases' } },
              HAS_FIELD_OBSERVABLES,
              ...(owner != null ? [{ term: { 'cases.owner': owner } }] : []),
            ],
          },
        },
        functions: [{ random_score: { seed: 20621, field: '_seq_no' } }],
      },
    },
  });

  return response.hits.hits.map((hit) => ({
    id: (hit._id ?? '').replace(/^cases:/, ''),
    observables: hit._source?.cases?.observables ?? [],
  }));
};

/** Checks that each sampled observable has an attachment with its derived id and old id. */
const verifySample = async (es: Client, size: number): Promise<Verification> => {
  const cases = await sampleCases(es, size);
  const expected = new Map<string, Set<string>>();
  let fieldObservables = 0;

  for (const { id: caseId, observables } of cases) {
    for (const { id: legacyId, typeKey, value } of observables) {
      fieldObservables += 1;
      if (typeKey && value) {
        const id = deriveObservableId({ caseId, typeKey, value });
        const legacyIds = expected.get(id) ?? new Set<string>();
        if (legacyId != null) {
          legacyIds.add(legacyId);
        }
        expected.set(id, legacyIds);
      }
    }
  }

  let missing = 0;
  let legacyIdMismatch = 0;
  const missingExamples: string[] = [];

  for (const ids of chunk([...expected.keys()], MGET_CHUNK)) {
    const { docs } = await es.mget<{ 'cases-attachments'?: { data?: { legacyId?: string } } }>({
      index: ALERTING_CASES_INDEX,
      ids: ids.map((id) => `cases-attachments:${id}`),
      _source: ['cases-attachments.data.legacyId'],
    });

    docs.forEach((doc, index) => {
      const id = ids[index];
      if (!('found' in doc) || !doc.found) {
        missing += 1;
        if (missingExamples.length < 5) {
          missingExamples.push(id);
        }
        return;
      }
      const legacyId = doc._source?.['cases-attachments']?.data?.legacyId;
      if (legacyId == null || !expected.get(id)?.has(legacyId)) {
        legacyIdMismatch += 1;
      }
    });
  }

  return {
    cases: cases.length,
    fieldObservables,
    distinctObservables: expected.size,
    missing,
    legacyIdMismatch,
    missingExamples,
  };
};

const measureReads = async (
  es: Client,
  request: Requester,
  config: BenchmarkConfig
): Promise<Reads> => {
  const { owner, readSamples } = config;
  const cases = await sampleCases(es, readSamples, owner);
  if (cases.length === 0) {
    throw new Error(`No ${owner} cases hold observables in their field`);
  }
  const caseAt = (run: number) => cases[run % cases.length];
  const findCases = (perPage: number) =>
    request(
      'GET',
      `/api/cases/_find?owner=${owner}&perPage=${perPage}&sortField=createdAt&sortOrder=desc`
    );
  const findObservables = (caseId: string, body: Record<string, unknown>) =>
    request<{ observables: unknown[]; total: number }>(
      'POST',
      `/internal/cases/${caseId}/observables/_find`,
      body
    );

  let run = 0;
  const next = () => caseAt(run++);
  const latency: Record<string, LatencyStats> = {
    'case get': await sample(readSamples, () => request('GET', `/api/cases/${next().id}`)),
    'case _find perPage 20': await sample(readSamples, () => findCases(20)),
    'case _find perPage 100': await sample(readSamples, () => findCases(100)),
    'observables _find first page': await sample(readSamples, () =>
      findObservables(next().id, { perPage: 20 })
    ),
    'observables _find value search': await sample(readSamples, () => {
      const { id, observables } = next();
      const value = observables.find((observable) => observable.value)?.value ?? '';
      return findObservables(id, { perPage: 20, search: value.slice(0, 6) });
    }),
  };

  const [first] = cases;
  const theCase = await request<{ observables: unknown[]; total_observables: number | null }>(
    'GET',
    `/api/cases/${first.id}`
  );
  const firstPage = await findObservables(first.id, { perPage: 100 });
  const checks = {
    'sample case': first.id,
    'field observables': first.observables.length,
    'case response observables': theCase.observables.length,
    'case response total_observables': theCase.total_observables,
    'observables _find total': firstPage.total,
  };

  const rule = await createProbeRule(request, TAG);
  const probe = new RuleWriteProbe(es, rule.id, config.probeIntervalMs);
  try {
    probe.start();
    await delay(config.probeSeconds * 1_000);
    return { latency, checks, ruleWrite: await probe.stop() };
  } finally {
    await request('DELETE', `/api/alerting/rule/${rule.id}`).catch((error) =>
      logger.warning(`Could not delete the probe rule ${rule.id}: ${error}`)
    );
  }
};

const printSnapshot = ({ label, index, counts, task, verification, reads }: SnapshotReport) => {
  logger.info(`Snapshot ${label}: ${ALERTING_CASES_INDEX} (primaries)\n${formatTable({ index })}`);
  logger.info(
    `Objects\n${formatTable({
      counts: {
        ...counts.byType,
        'observable attachments': counts.observableAttachments,
        'with legacyId': counts.withLegacyId,
        'cases with field observables': counts.casesWithFieldObservables,
        'field observables': counts.fieldObservables,
      },
    })}`
  );
  if (task != null) {
    logger.info(`Migration task: ${task.status}, ${JSON.stringify(task.state)}`);
  }
  if (verification != null) {
    logger.info(`Verification\n${formatTable({ sample: verification })}`);
  }
  if (reads != null) {
    logger.info(
      `Reads\n${formatTable(
        Object.fromEntries(
          Object.entries(reads.latency).map(([name, stats]) => [name, latencyRow(stats)])
        )
      )}`
    );
    logger.info(
      `Rule status write\n${formatTable({
        snapshot: { ...latencyRow(reads.ruleWrite.latency), errors: reads.ruleWrite.errors },
      })}`
    );
    logger.info(`Checks\n${formatTable({ values: reads.checks })}`);
  }
};

/** Records storage, object counts and, optionally, correctness and read latency at one point. */
export const runSnapshot = async (
  es: Client,
  request: Requester | undefined,
  config: BenchmarkConfig
): Promise<void> => {
  let forceMergeSeconds: number | undefined;
  if (config.forceMerge) {
    logger.info(`Force merging ${ALERTING_CASES_INDEX} to one segment`);
    const { ms } = await timed(() =>
      es.indices.forcemerge(
        { index: ALERTING_CASES_INDEX, max_num_segments: 1 },
        { requestTimeout: FORCE_MERGE_TIMEOUT_MS }
      )
    );
    forceMergeSeconds = Math.round(ms / 1000);
  }
  await es.indices.refresh({ index: ALERTING_CASES_INDEX });
  await es.indices.flush({ index: ALERTING_CASES_INDEX });

  const [index, counts, task] = await Promise.all([
    getIndexStats(es),
    getObjectCounts(es),
    getMigrationTask(es),
  ]);
  const verification =
    config.verifyCases > 0 && counts.observableAttachments > 0
      ? await verifySample(es, config.verifyCases)
      : undefined;
  const reads = request != null ? await measureReads(es, request, config) : undefined;

  const report: SnapshotReport = {
    label: config.label,
    takenAt: new Date().toISOString(),
    forceMergeSeconds,
    index,
    counts,
    task,
    verification,
    reads,
  };

  const out = path.join(config.out, `snapshot-${config.label}.json`);
  fs.mkdirSync(config.out, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  printSnapshot(report);
  logger.success(`Snapshot written to ${out}`);
};
