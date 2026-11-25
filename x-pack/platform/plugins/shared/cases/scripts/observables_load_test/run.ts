/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import pMap from 'p-map';
import yargs from 'yargs';
import type { Client } from '@elastic/elasticsearch';
import { createEsClient, createKbnClient } from '../cases_generator/clients';
import { logger } from '../cases_generator/logger';
import type { KbnContext } from '../cases_generator/types';
import { ALERTING_CASES_INDEX, RuleWriteProbe } from './probe';
import type { ProbeResult } from './probe';
import type { LatencyStats } from './stats';
import { delay, sample, summarize, timed } from './stats';

const TAG = 'observables-load-test';
const IPV4 = 'observable-type-ipv4';
const HOSTNAME = 'observable-type-hostname';
/** A value many cases hold, like a public DNS server. */
const SHARED_VALUE = '8.8.8.8';

interface LoadTestConfig {
  kibana: string;
  elasticsearch: string;
  username: string;
  password: string;
  esUsername: string;
  esPassword: string;
  observables: number;
  cases: number;
  sharedCases: number;
  batch: number;
  concurrency: number;
  owner: string;
  readSamples: number;
  probeIntervalMs: number;
  baselineSeconds: number;
  keep: boolean;
  out: string;
}

interface BulkCreateReport {
  added: unknown[];
  skipped_duplicates: unknown[];
  skipped_over_cap: unknown[];
  total_observables: number;
}

interface FindResponse {
  observables: Array<{ id: string; typeKey: string; value: string }>;
  total: number;
  cursor?: string;
}

interface CaseResponse {
  id: string;
  observables: unknown[];
  total_observables: number | null;
}

interface IndexStats {
  luceneDocs: number;
  storeBytes: number;
  observables: number;
}

const parseConfig = (): LoadTestConfig =>
  yargs.help().options({
    kibana: { type: 'string', default: 'http://localhost:5601', describe: 'Kibana URL' },
    elasticsearch: {
      type: 'string',
      default: 'http://localhost:9200',
      describe: 'Elasticsearch URL, for the rule write probe and index stats',
    },
    username: { type: 'string', default: 'elastic' },
    password: { type: 'string', default: 'changeme' },
    esUsername: {
      type: 'string',
      default: 'system_indices_superuser',
      describe: 'Elasticsearch user that may write the system index shared with rules',
    },
    esPassword: { type: 'string', default: 'changeme' },
    observables: { type: 'number', default: 10_000, describe: 'Observables per case' },
    cases: { type: 'number', default: 1, describe: 'Cases to fill' },
    sharedCases: {
      type: 'number',
      default: 0,
      describe: `More cases that each hold only ${SHARED_VALUE}, which the first case holds too`,
    },
    batch: { type: 'number', default: 1_000, describe: 'Observables per bulk create request' },
    concurrency: { type: 'number', default: 4, describe: 'Bulk create requests in flight' },
    owner: { type: 'string', default: 'securitySolution' },
    readSamples: { type: 'number', default: 20, describe: 'Timed runs per read' },
    probeIntervalMs: { type: 'number', default: 100, describe: 'Pause between rule writes' },
    baselineSeconds: { type: 'number', default: 10, describe: 'Rule write baseline duration' },
    keep: { type: 'boolean', default: false, describe: 'Keep the cases and the probe rule' },
    out: { type: 'string', default: 'observables_load_report.json', describe: 'Report path' },
  }).argv as LoadTestConfig;

/** Unique values per case: four in five are IPv4 addresses, one in five host names. */
const observableAt = (index: number) =>
  index % 5 === 0
    ? { typeKey: HOSTNAME, value: `host-${index}.example.com`, description: null }
    : {
        typeKey: IPV4,
        value: `10.${Math.floor(index / 65_536) % 256}.${Math.floor(index / 256) % 256}.${
          index % 256
        }`,
        description: null,
      };

const range = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(0, end - start) }, (_, offset) => start + offset);

const createRequester =
  ({ kbnClient, headers }: KbnContext) =>
  async <T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> => {
    const { data } = await kbnClient.request<T>({
      method,
      path,
      body,
      retries: 0,
      headers: { ...headers, 'x-elastic-internal-origin': 'kibana' },
    });
    return data;
  };

const getIndexStats = async (es: Client): Promise<IndexStats> => {
  await es.indices.flush({ index: ALERTING_CASES_INDEX });
  const [stats, { count }] = await Promise.all([
    es.indices.stats({ index: ALERTING_CASES_INDEX, metric: ['docs', 'store'] }),
    es.count({
      index: ALERTING_CASES_INDEX,
      query: { term: { type: 'cases-observables' } },
    }),
  ]);
  const primaries = stats._all.primaries;
  return {
    luceneDocs: primaries?.docs?.count ?? 0,
    storeBytes: primaries?.store?.size_in_bytes ?? 0,
    observables: count,
  };
};

interface TotalsResponse {
  total: number;
  total_relation?: 'eq' | 'gte';
  skipped_common_observables?: number;
}

/**
 * Creates the cases that each hold only the shared value, and adds it to the first case too, so the
 * cases-by-observable routes and similar cases meet a common value.
 */
const addSharedValueCases = async ({
  request,
  config,
  firstCaseId,
}: {
  request: ReturnType<typeof createRequester>;
  config: LoadTestConfig;
  firstCaseId: string;
}): Promise<CaseResponse[]> => {
  logger.info(`Creating ${config.sharedCases} cases that each hold ${SHARED_VALUE}`);
  const sharedCases = await pMap(
    range(0, config.sharedCases),
    (index) =>
      request<CaseResponse>('POST', '/api/cases', {
        title: `${TAG} shared ${index}`,
        description: `Holds ${SHARED_VALUE} for a load test`,
        tags: [TAG],
        owner: config.owner,
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false },
      }),
    { concurrency: 10 }
  );
  await pMap(
    [firstCaseId, ...sharedCases.map(({ id }) => id)],
    (id) =>
      request('POST', `/internal/cases/${id}/observables/_bulk_create`, {
        observables: [{ typeKey: IPV4, value: SHARED_VALUE, description: null }],
      }),
    { concurrency: 10 }
  );
  return sharedCases;
};

export const runObservablesLoadTest = async (): Promise<void> => {
  const config = parseConfig();
  const { kibana, elasticsearch, username, password, esUsername, esPassword } = config;
  // TLS (with the dev CA) is used for whichever URL is https.
  const request = createRequester(
    createKbnClient({ url: kibana, username, password, ssl: kibana.startsWith('https:') })
  );
  const es = createEsClient({
    node: elasticsearch,
    ssl: elasticsearch.startsWith('https:'),
    username: esUsername,
    password: esPassword,
  });

  const indexBefore = await getIndexStats(es);
  const rule = await request<{ id: string }>('POST', '/api/alerting/rule', {
    name: `${TAG} probe`,
    rule_type_id: '.index-threshold',
    consumer: 'stackAlerts',
    enabled: false,
    schedule: { interval: '1m' },
    actions: [],
    params: {
      index: [TAG],
      timeField: '@timestamp',
      aggType: 'count',
      groupBy: 'all',
      thresholdComparator: '>',
      threshold: [1_000_000],
      timeWindowSize: 5,
      timeWindowUnit: 'm',
    },
  });
  const probe = new RuleWriteProbe(es, rule.id, config.probeIntervalMs);

  try {
    logger.info(`Measuring rule write latency for ${config.baselineSeconds}s before the load`);
    probe.start();
    await delay(config.baselineSeconds * 1_000);
    const ruleWriteBaseline = await probe.stop();

    const cases = await pMap(
      range(0, config.cases),
      (index) =>
        request<CaseResponse>('POST', '/api/cases', {
          title: `${TAG} ${index}`,
          description: 'Holds observables for a load test',
          tags: [TAG],
          owner: config.owner,
          connector: { id: 'none', name: 'none', type: '.none', fields: null },
          settings: { syncAlerts: false },
        }),
      { concurrency: 10 }
    );

    const batches = cases.flatMap(({ id }) =>
      range(0, Math.ceil(config.observables / config.batch)).map((batch) => ({
        caseId: id,
        start: batch * config.batch,
        end: Math.min(config.observables, (batch + 1) * config.batch),
      }))
    );

    logger.info(
      `Adding ${config.observables} observables to each of ${cases.length} cases in ${batches.length} requests`
    );
    probe.start();
    const { result: bulkResults, ms: bulkAddMs } = await timed(() =>
      pMap(
        batches,
        ({ caseId, start, end }) =>
          timed(() =>
            request<BulkCreateReport>(
              'POST',
              `/internal/cases/${caseId}/observables/_bulk_create`,
              { observables: range(start, end).map(observableAt) }
            )
          ),
        { concurrency: config.concurrency }
      )
    );
    const ruleWriteDuringBulkAdd = await probe.stop();

    const sharedCases =
      config.sharedCases > 0
        ? await addSharedValueCases({ request, config, firstCaseId: cases[0].id })
        : [];

    const sum = (key: 'added' | 'skipped_duplicates' | 'skipped_over_cap') =>
      bulkResults.reduce((total, { result }) => total + result[key].length, 0);
    const bulkAdd = {
      requests: bulkResults.length,
      totalSeconds: Math.round(bulkAddMs / 100) / 10,
      observablesPerSecond: Math.round(sum('added') / (bulkAddMs / 1_000)),
      added: sum('added'),
      duplicates: sum('skipped_duplicates'),
      overCap: sum('skipped_over_cap'),
      requestLatency: summarize(bulkResults.map(({ ms }) => ms)),
    };

    const [{ id: caseId }] = cases;
    const find = (body: Record<string, unknown>) =>
      request<FindResponse>('POST', `/internal/cases/${caseId}/observables/_find`, body);
    const pageKeys = (await find({ perPage: 20 })).observables.map(({ typeKey, value }) => ({
      typeKey,
      value,
    }));
    const countCases = (observables: Array<{ typeKey: string; value: string }>) =>
      request('POST', '/internal/cases/observables/_count_cases', {
        owner: config.owner,
        excludeCaseId: caseId,
        observables,
      });
    const findCasesBySharedValue = (perPage: number) =>
      request<TotalsResponse>('POST', '/internal/cases/observables/_find_cases', {
        owner: config.owner,
        typeKey: IPV4,
        value: SHARED_VALUE,
        excludeCaseId: caseId,
        perPage,
      });
    const similarCases = (perPage: number) =>
      request<TotalsResponse>('POST', `/internal/cases/${caseId}/_similar`, { page: 1, perPage });

    logger.info(`Timing reads on case ${caseId}`);
    probe.start();
    const reads: Record<string, LatencyStats> = {
      findFirstPageByCreatedAt: await sample(config.readSamples, () => find({ perPage: 20 })),
      findFirstPageByValue: await sample(config.readSamples, () =>
        find({ perPage: 20, sortField: 'value', sortOrder: 'desc' })
      ),
      findTypeFilter: await sample(config.readSamples, () =>
        find({ perPage: 20, typeKeys: [HOSTNAME] })
      ),
      findValueSearch: await sample(config.readSamples, () =>
        find({ perPage: 20, search: 'host-12' })
      ),
      getCase: await sample(config.readSamples, () => request('GET', `/api/cases/${caseId}`)),
      // Case responses carry the observables preview, built with one aggregation per request.
      findCases: await sample(config.readSamples, () =>
        request('GET', `/api/cases/_find?tags=${TAG}&perPage=20`)
      ),
      findCasesPageOf100: await sample(config.readSamples, () =>
        request('GET', `/api/cases/_find?tags=${TAG}&perPage=100`)
      ),
      bulkGetCases: await sample(config.readSamples, () =>
        request('POST', '/internal/cases/_bulk_get', {
          ids: cases.slice(0, 1_000).map(({ id }) => id),
        })
      ),
      // The observables table's Related cases column: one count request per page of 20.
      countCasesForAPage: await sample(config.readSamples, () => countCases(pageKeys)),
      countCasesBySharedValue: await sample(config.readSamples, () =>
        countCases([{ typeKey: IPV4, value: SHARED_VALUE }])
      ),
      findCasesBySharedValue: await sample(config.readSamples, () => findCasesBySharedValue(20)),
      findCasesBySharedValueTotal: await sample(config.readSamples, () =>
        findCasesBySharedValue(0)
      ),
      // The similar cases tab, and its count, which every case view loads.
      similarCases: await sample(config.readSamples, () => similarCases(20)),
      similarCasesTotal: await sample(config.readSamples, () => similarCases(0)),
    };

    const pageLatencies: number[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const { result, ms } = await timed(() =>
        find({ perPage: 100, ...(cursor != null && { cursor }) })
      );
      pageLatencies.push(ms);
      cursor = result.cursor;
      if (cursor == null) break;
    }
    reads.findCursorPagesOf100 = summarize(pageLatencies);
    const ruleWriteDuringReads = await probe.stop();

    const theCase = await request<CaseResponse>('GET', `/api/cases/${caseId}`);
    const firstPage = await find({ perPage: 20 });
    const sharedValueCases = await findCasesBySharedValue(0);
    const similar = await similarCases(0);
    const checks = {
      expectedObservables: config.observables,
      caseTotalObservables: theCase.total_observables,
      casePreviewSize: theCase.observables.length,
      findTotal: firstPage.total,
      sharedValueCases: sharedValueCases.total,
      sharedValueCasesIsMinimum: Number(sharedValueCases.total_relation === 'gte'),
      similarCases: similar.total,
      similarSkippedCommon: similar.skipped_common_observables ?? 0,
    };

    const indexAfterAdd = await getIndexStats(es);

    const allCases = [...cases, ...sharedCases];
    let deleteCases:
      | { requestSeconds: number; untilObservablesGoneSeconds: number; observablesLeft: number }
      | undefined;
    if (!config.keep) {
      logger.info(`Deleting ${allCases.length} cases`);
      const startedAt = Date.now();
      // The delete API takes at most 100 case ids per request.
      const { ms } = await timed(async () => {
        for (let start = 0; start < allCases.length; start += 100) {
          const ids = allCases.slice(start, start + 100).map(({ id }) => id);
          await request('DELETE', `/api/cases?ids=${encodeURIComponent(JSON.stringify(ids))}`);
        }
      });
      // A background task deletes the observables of deleted cases; wait for it, up to 10 minutes.
      let observablesLeft = (await getIndexStats(es)).observables - indexBefore.observables;
      while (observablesLeft > 0 && Date.now() - startedAt < 600_000) {
        await delay(1_000);
        observablesLeft = (await getIndexStats(es)).observables - indexBefore.observables;
      }
      deleteCases = {
        requestSeconds: Math.round(ms / 100) / 10,
        untilObservablesGoneSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
        observablesLeft,
      };
    }

    const report = {
      config,
      cases: cases.map(({ id }) => id),
      sharedCases: sharedCases.length,
      ruleWrite: {
        baseline: ruleWriteBaseline,
        duringBulkAdd: ruleWriteDuringBulkAdd,
        duringReads: ruleWriteDuringReads,
      },
      bulkAdd,
      reads,
      checks,
      index: { before: indexBefore, afterAdd: indexAfterAdd },
      deleteCases,
    };

    fs.writeFileSync(config.out, JSON.stringify(report, null, 2));
    printReport(report);
    logger.success(`Report written to ${config.out}`);
  } finally {
    if (!config.keep) {
      await request('DELETE', `/api/alerting/rule/${rule.id}`).catch((error) =>
        logger.warning(`Could not delete the probe rule ${rule.id}: ${error}`)
      );
    }
  }
};

/** Renders rows as an aligned text table for the tooling log. */
const formatTable = (rows: Record<string, object>): string => {
  const cells = Object.entries(rows).map(
    ([name, row]) => [name, new Map<string, unknown>(Object.entries(row))] as const
  );
  const columns = [...new Set(cells.flatMap(([, row]) => [...row.keys()]))];
  const lines = [
    ['', ...columns],
    ...cells.map(([name, row]) => [
      name,
      ...columns.map((column) => String(row.get(column) ?? '')),
    ]),
  ];
  const widths = lines[0].map((_, index) => Math.max(...lines.map((line) => line[index].length)));
  return lines
    .map((line) => line.map((cell, index) => cell.padEnd(widths[index])).join('  '))
    .join('\n');
};

const printReport = ({
  ruleWrite,
  bulkAdd,
  reads,
  checks,
  index,
  deleteCases,
}: {
  ruleWrite: Record<string, ProbeResult>;
  bulkAdd: { totalSeconds: number; observablesPerSecond: number; requestLatency: LatencyStats };
  reads: Record<string, LatencyStats>;
  checks: Record<string, number | null>;
  index: Record<string, IndexStats>;
  deleteCases?: {
    requestSeconds: number;
    untilObservablesGoneSeconds: number;
    observablesLeft: number;
  };
}) => {
  const latencyRow = (stats: LatencyStats) => ({
    count: stats.count,
    'p50 ms': stats.p50,
    'p95 ms': stats.p95,
    'p99 ms': stats.p99,
    'max ms': stats.max,
  });

  logger.info(
    `Rule status write latency\n${formatTable(
      Object.fromEntries(
        Object.entries(ruleWrite).map(([phase, { latency, errors }]) => [
          phase,
          { ...latencyRow(latency), errors },
        ])
      )
    )}`
  );
  logger.info(
    `Bulk add: ${bulkAdd.totalSeconds}s, ${bulkAdd.observablesPerSecond} observables/s, request p95 ${bulkAdd.requestLatency.p95} ms`
  );
  logger.info(
    `Reads\n${formatTable(
      Object.fromEntries(Object.entries(reads).map(([name, stats]) => [name, latencyRow(stats)]))
    )}`
  );
  logger.info(`Checks\n${formatTable({ values: checks })}`);
  logger.info(`Index ${ALERTING_CASES_INDEX} (primaries)\n${formatTable(index)}`);
  if (deleteCases) {
    logger.info(
      `Case delete: request ${deleteCases.requestSeconds}s, observables gone after ${deleteCases.untilObservablesGoneSeconds}s, left: ${deleteCases.observablesLeft}`
    );
  }
};
