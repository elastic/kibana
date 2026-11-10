/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Summarises one or more sample files written by sample_tm.ts into a comparison
 * table. Process and Task Manager figures come from the samples; task runs come
 * from the Kibana event log (`task-run` events) for each sample window, because
 * the Task Manager metrics endpoint resets its counters every 30 s.
 *
 * Usage:
 *   node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/summarize_samples.ts \
 *     [--task-type alerting_v2:rule_executor] ./bench/fixed-10-2gb.ndjson ./bench/auto-2gb.ndjson
 *
 * Omit `--task-type` to count every task type that ran in the window. Pass
 * `--skip-minutes N` to drop the first N minutes of each file, for example the
 * backlog drain after a Kibana restart. `--rows-returned N` keeps only alerting v2
 * rule runs whose query returned N rows, which separates heavy from light rules
 * created from the same index with different `--limit` values. A sample file that
 * carries the node's `kibana.uuid` is summarised for that node only (event log runs
 * are filtered by `kibana.server_uuid`); pass `--all-nodes` to count every node.
 */

import { readFileSync } from 'fs';
import { es, intArg, log, parseArgs } from './lib';

interface Sample {
  '@timestamp': string;
  label: string;
  kibana?: { uuid?: string; name?: string };
  process: {
    uptime_ms?: number;
    heap_used_mb?: number;
    heap_limit_mb?: number;
    rss_mb?: number;
    event_loop_delay_ms?: number;
    elu?: number;
  };
  task_manager: {
    capacity?: { config?: number; as_cost?: number; as_workers?: number };
    overdue?: number;
    drift?: { p99?: number };
  };
}

interface RunStats {
  readonly runs: number;
  readonly successRate: number;
  readonly durationP50s: number;
  readonly durationP99s: number;
  readonly pickupDelayP50s: number;
  readonly pickupDelayP99s: number;
  /** Heap attributed per run by adaptive capacity (`kibana.task.memory_bytes`); 0 without it. */
  readonly memoryP50Mb: number;
  readonly memoryP99Mb: number;
  /** Peak the task reported itself (`kibana.task.memory_reported_bytes`); 0 when no run reported. */
  readonly reportedP50Mb: number;
  readonly reportedP99Mb: number;
}

interface Summary extends RunStats {
  readonly label: string;
  readonly minutes: number;
  readonly runsPerMinute: number;
  readonly heapPeakMb: number;
  readonly heapLimitMb: number;
  readonly eluAvg: number;
  readonly eventLoopDelayMaxMs: number;
  readonly overduePeak: number;
  readonly driftP99MaxMs: number;
  readonly capacityMin: number;
  readonly capacityMax: number;
  readonly restarts: number;
}

const readSamples = (file: string): Sample[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Sample);

const max = (values: readonly (number | undefined)[]): number =>
  values.reduce<number>((acc, value) => (value !== undefined && value > acc ? value : acc), 0);

const min = (values: readonly (number | undefined)[]): number =>
  values.reduce<number>(
    (acc, value) => (value !== undefined && value < acc ? value : acc),
    Number.POSITIVE_INFINITY
  );

const avg = (values: readonly (number | undefined)[]): number => {
  const defined = values.filter((value): value is number => value !== undefined);
  return defined.length === 0 ? 0 : defined.reduce((a, b) => a + b, 0) / defined.length;
};

const countRestarts = (samples: readonly Sample[]): number => {
  let restarts = 0;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1].process.uptime_ms;
    const curr = samples[i].process.uptime_ms;
    if (prev !== undefined && curr !== undefined && curr < prev) restarts++;
  }
  return restarts;
};

interface EventLogAggs {
  hits: { total: { value: number } };
  aggregations: {
    duration: { values: Record<string, number> };
    delay: { values: Record<string, number> };
    memory: { values: Record<string, number | null> };
    reported: { values: Record<string, number | null> };
    outcome: { buckets: Array<{ key: string; doc_count: number }> };
  };
}

const NS_PER_S = 1e9;

interface RunFilter {
  readonly taskType?: string;
  readonly rowsReturned?: number;
  readonly allNodes?: boolean;
}

const queryRuns = async (
  from: string,
  to: string,
  runFilter: RunFilter,
  serverUuid?: string
): Promise<RunStats> => {
  const filter: unknown[] = [
    { term: { 'event.action': 'task-run' } },
    { range: { '@timestamp': { gte: from, lte: to } } },
  ];
  if (serverUuid && !runFilter.allNodes)
    filter.push({ term: { 'kibana.server_uuid': serverUuid } });
  if (runFilter.taskType) filter.push({ term: { 'kibana.task.type': runFilter.taskType } });
  if (runFilter.rowsReturned !== undefined) {
    filter.push({
      term: { 'kibana.task.data.metrics.rowsReturnedByQuery': runFilter.rowsReturned },
    });
  }

  const result = await es<EventLogAggs>('/.kibana-event-log*/_search?size=0', {
    method: 'POST',
    body: {
      // the default total caps at 10,000, which an overnight run exceeds many times over
      track_total_hits: true,
      query: { bool: { filter } },
      aggs: {
        duration: { percentiles: { field: 'event.duration', percents: [50, 99] } },
        delay: { percentiles: { field: 'kibana.task.schedule_delay', percents: [50, 99] } },
        memory: { percentiles: { field: 'kibana.task.memory_bytes', percents: [50, 99] } },
        reported: {
          percentiles: { field: 'kibana.task.memory_reported_bytes', percents: [50, 99] },
        },
        outcome: { terms: { field: 'event.outcome' } },
      },
    },
  });
  const runs = result.hits.total.value;
  const successes =
    result.aggregations.outcome.buckets.find(({ key }) => key === 'success')?.doc_count ?? 0;
  const pct = (values: Record<string, number>, key: string): number =>
    (values[key] ?? 0) / NS_PER_S;
  return {
    runs,
    successRate: runs > 0 ? successes / runs : 1,
    durationP50s: pct(result.aggregations.duration.values, '50.0'),
    durationP99s: pct(result.aggregations.duration.values, '99.0'),
    pickupDelayP50s: pct(result.aggregations.delay.values, '50.0'),
    pickupDelayP99s: pct(result.aggregations.delay.values, '99.0'),
    memoryP50Mb: (result.aggregations.memory.values['50.0'] ?? 0) / 2 ** 20,
    memoryP99Mb: (result.aggregations.memory.values['99.0'] ?? 0) / 2 ** 20,
    reportedP50Mb: (result.aggregations.reported.values['50.0'] ?? 0) / 2 ** 20,
    reportedP99Mb: (result.aggregations.reported.values['99.0'] ?? 0) / 2 ** 20,
  };
};

const summarize = async (file: string, runFilter: RunFilter, skipMinutes = 0): Promise<Summary> => {
  const all = readSamples(file);
  if (all.length < 2) throw new Error(`${file}: need at least two samples`);
  const cutoff = new Date(all[0]['@timestamp']).getTime() + skipMinutes * 60_000;
  const samples = all.filter((sample) => new Date(sample['@timestamp']).getTime() >= cutoff);
  if (samples.length < 2) throw new Error(`${file}: fewer than two samples after the skip`);
  const from = samples[0]['@timestamp'];
  const to = samples[samples.length - 1]['@timestamp'];
  const minutes = (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
  const runStats = await queryRuns(from, to, runFilter, samples[0].kibana?.uuid);
  const capacities = samples.map((s) => s.task_manager.capacity?.as_cost);
  return {
    ...runStats,
    label: samples[0].kibana?.name
      ? `${samples[0].label} @ ${samples[0].kibana.name}`
      : samples[0].label,
    minutes,
    runsPerMinute: minutes > 0 ? runStats.runs / minutes : 0,
    heapPeakMb: max(samples.map((s) => s.process.heap_used_mb)),
    heapLimitMb: max(samples.map((s) => s.process.heap_limit_mb)),
    eluAvg: avg(samples.map((s) => s.process.elu)),
    eventLoopDelayMaxMs: max(samples.map((s) => s.process.event_loop_delay_ms)),
    overduePeak: max(samples.map((s) => s.task_manager.overdue)),
    driftP99MaxMs: max(samples.map((s) => s.task_manager.drift?.p99)),
    capacityMin: min(capacities),
    capacityMax: max(capacities),
    restarts: countRestarts(samples),
  };
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const taskType = args.values.get('task-type');
  const skipMinutes = intArg(args, 'skip-minutes', 0);
  const rowsReturned = args.values.has('rows-returned')
    ? intArg(args, 'rows-returned', 0)
    : undefined;
  const runFilter: RunFilter = { taskType, rowsReturned, allNodes: args.flags.has('all-nodes') };
  const files = process.argv.slice(2).filter((arg, i, all) => {
    if (arg.startsWith('--')) return false;
    return !(i > 0 && ['--task-type', '--skip-minutes', '--rows-returned'].includes(all[i - 1]));
  });
  if (files.length === 0) throw new Error('pass one or more sample files');

  const rows: Summary[] = [];
  for (const file of files) rows.push(await summarize(file, runFilter, skipMinutes));

  const header = [
    'label',
    'min',
    'runs',
    'runs/min',
    'success',
    'dur p50/p99 s',
    'pickup p50/p99 s',
    'run heap p50/p99 MB',
    'reported p50/p99 MB',
    'heap peak/limit MB',
    'ELU avg',
    'EL delay max ms',
    'overdue peak',
    'drift p99 max ms',
    'capacity (cost)',
    'restarts',
  ];
  const lines = rows.map((r) => [
    r.label,
    r.minutes.toFixed(1),
    String(r.runs),
    r.runsPerMinute.toFixed(1),
    `${(r.successRate * 100).toFixed(1)}%`,
    `${r.durationP50s.toFixed(2)}/${r.durationP99s.toFixed(2)}`,
    `${r.pickupDelayP50s.toFixed(2)}/${r.pickupDelayP99s.toFixed(2)}`,
    `${r.memoryP50Mb.toFixed(1)}/${r.memoryP99Mb.toFixed(1)}`,
    `${r.reportedP50Mb.toFixed(1)}/${r.reportedP99Mb.toFixed(1)}`,
    `${r.heapPeakMb}/${r.heapLimitMb}`,
    r.eluAvg.toFixed(2),
    r.eventLoopDelayMaxMs.toFixed(0),
    String(r.overduePeak),
    r.driftP99MaxMs.toFixed(0),
    `${r.capacityMin}..${r.capacityMax}`,
    String(r.restarts),
  ]);
  log(
    `task type: ${taskType ?? 'all'}${
      rowsReturned === undefined ? '' : ` with ${rowsReturned} rows returned`
    }; skipped first ${skipMinutes} min of each file`
  );
  log(`| ${header.join(' | ')} |`);
  log(`| ${header.map(() => '---').join(' | ')} |`);
  for (const line of lines) log(`| ${line.join(' | ')} |`);
};

main().catch((error) => {
  log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
