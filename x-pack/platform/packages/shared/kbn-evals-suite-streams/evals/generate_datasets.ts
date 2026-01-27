/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { SampleParserClient } from '@kbn/sample-log-parser';
import type {
  SystemIdentificationEvaluationDataset,
  SystemIdentificationEvaluationExample,
} from './system_identification_datasets';

const LOGHUB_SYSTEMS = [
  'Apache',
  'BGL',
  'Hadoop',
  'HDFS',
  'HealthApp',
  'HPC',
  'Mac',
  'OpenSSH',
  'OpenStack',
  'Proxifier',
  'Spark',
  'Thunderbird',
  'Zookeeper',
];

function hashSeed(str: string): number {
  // Simple 31-based polynomial rolling hash (no bitwise)
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 2147483647;
  }
  return h || 1; // avoid zero
}

function lcg(seed: number): () => number {
  // Park–Miller minimal standard LCG
  let state = seed % 2147483647;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function pickUnique<T>(items: T[], count: number, seedKey: string): T[] {
  if (count > items.length) {
    throw new Error(`Cannot pick ${count} unique items out of ${items.length}`);
  }
  const rng = lcg(hashSeed(seedKey));
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

const BASE_SEED = process.env.SEED || 'default-seed';

// ---------------------------------------------------------------------------
// Criteria builders
// ---------------------------------------------------------------------------

function buildProgressiveCounts({
  selected,
  label,
  thresholds,
}: {
  selected: string[];
  label: string; // e.g. 'system' or 'serverless system'
  thresholds: number[];
}): string[] {
  const criteria: string[] = [];
  const max = selected.length;
  for (const t of thresholds) {
    if (t <= max) {
      criteria.push(
        `Identifies at least ${t === 1 ? 'one' : t} ${label}${
          t > 1 ? 's' : ''
        } out of ${selected.join(', ')}`
      );
    }
  }
  return criteria;
}

function buildLoghubCriteria(selected: string[]): string[] {
  const criteria = buildProgressiveCounts({
    selected,
    label: 'system',
    thresholds: [1, 3, 5, 8],
  });
  // Removed granular "no other systems" constraints per instructions.
  return criteria;
}

function buildServerlessCriteria(selected: string[]): string[] {
  return buildProgressiveCounts({
    selected,
    label: 'serverless system',
    thresholds: [1, 3, 5, 8, 12],
  });
}

function buildMixedCriteria(loghubSelected: string[], serverlessSelected: string[]): string[] {
  const criteria: string[] = [];
  criteria.push(...buildLoghubCriteria(loghubSelected));
  criteria.push(...buildServerlessCriteria(serverlessSelected));
  if (loghubSelected.length || serverlessSelected.length) {
    criteria.push('Does not identify systems outside provided lists');
  }
  return criteria;
}

/**
 * Pick 1x3, 2x5, 1x8 systems from non-forked Loghub in logs.loghub (LOGHUB_SYSTEMS), and 1x logs.android
 * Each scenario uses an independent seeded selection (not a shared shuffle) so that modifying
 * counts does not cascade.
 */
export async function getLoghubDatasets(): Promise<SystemIdentificationEvaluationDataset[]> {
  // scenario definitions
  // We represent individual scenarios as simple objects; two 5-system scenarios need distinct ids
  const picks = [
    { count: 3, id: 'loghub-3' },
    { count: 5, id: 'loghub-5-a' },
    { count: 5, id: 'loghub-5-b', weight: 2 },
    { count: 8, id: 'loghub-8', weight: 3 },
  ];

  const examples = picks.map(({ count, id, weight }) => {
    const systems = pickUnique(LOGHUB_SYSTEMS, count, `${BASE_SEED}:${id}`);
    return {
      input: {
        stream: { name: 'logs.loghub' },
        systems: { loghub: systems, serverless: [] },
      },
      output: {
        criteria: [
          ...buildLoghubCriteria(systems),
          'Does not identify systems outside provided lists',
        ],
        weight,
      },
      metadata: {},
    } as SystemIdentificationEvaluationExample;
  });

  // Android example (no explicit systems list)
  examples.push({
    input: {
      stream: { name: 'logs.android' },
      systems: { loghub: [], serverless: [] },
    },
    output: {
      criteria: [
        'Identifies three systems by process.name: com.tencent.qt.qtl,com.android.systemui, com.android.phone',
        'Adds a filter for process.name, optionally with other filters',
        'Adds a filter for process.name BUT no other filters',
      ],
      weight: 2,
    },
    metadata: {},
  });

  return [
    {
      name: 'streams: system identification loghub',
      description: 'Seeded-random selections of loghub systems for 3, 5, 5, 8 + android scenarios',
      examples,
    },
  ];
}

/**
 * Pick 1x3, 2x5, 1x8,1x12 systems from serverless in loghub.serverless
 */
export async function getServerlessDatasets({
  log,
}: {
  log: ToolingLog;
}): Promise<SystemIdentificationEvaluationDataset[]> {
  const client = new SampleParserClient({ logger: log });
  const serverlessSystems = await client.listServerlessSystems();

  const counts = [
    { count: 3, id: 'serverless-3' },
    { count: 5, id: 'serverless-5-a' },
    { count: 5, id: 'serverless-5-b' },
    { count: 8, id: 'serverless-8', weight: 2 },
    { count: 12, id: 'serverless-12', weight: 3 },
  ];

  const examples: SystemIdentificationEvaluationExample[] = counts
    .filter(({ count }) => serverlessSystems.length >= Math.min(count, serverlessSystems.length))
    .map(({ count, id, weight }) => {
      const actualCount = Math.min(count, serverlessSystems.length);
      const systems = pickUnique(serverlessSystems, actualCount, `${BASE_SEED}:${id}`);
      return {
        input: {
          stream: { name: 'logs.serverless' },
          systems: { loghub: [], serverless: systems },
        },
        output: {
          criteria: [
            ...buildServerlessCriteria(systems),
            'Does not identify systems outside provided lists',
          ],
          weight,
        },
        metadata: {},
      } as SystemIdentificationEvaluationExample;
    });

  return [
    {
      name: 'streams: system identification serverless',
      description: 'Seeded-random selections of serverless systems for 3, 5, 5, 8, 12 scenarios',
      examples,
    },
  ];
}

/**
 * Pick 1 loghub + 3 serverless, 2 + 5, 3 + 12, in logs.mixed
 */
export async function getMixedDatasets(): Promise<SystemIdentificationEvaluationDataset[]> {
  // We need serverless system names; create a short-lived logger
  const log = new ToolingLog({ level: 'error', writeTo: process.stdout });
  const client = new SampleParserClient({ logger: log });
  const serverlessSystems = await client.listServerlessSystems();

  const scenarios = [
    { loghub: 1, serverless: 3, id: 'mixed-1-3', weight: 1 },
    { loghub: 2, serverless: 5, id: 'mixed-2-5', weight: 1 },
    { loghub: 5, serverless: 5, id: 'mixed-5-5', weight: 2 },
    { loghub: 3, serverless: 8, id: 'mixed-3-8', weight: 3 },
    { loghub: 8, serverless: 3, id: 'mixed-8-3', weight: 3 },
    { loghub: 8, serverless: 8, id: 'mixed-8-8', weight: 5 },
  ];

  const examples: SystemIdentificationEvaluationExample[] = scenarios
    .filter(
      (s) =>
        LOGHUB_SYSTEMS.length >= s.loghub &&
        serverlessSystems.length >= Math.min(s.serverless, serverlessSystems.length)
    )
    .map((s) => {
      const loghubPicked = pickUnique(LOGHUB_SYSTEMS, s.loghub, `${BASE_SEED}:${s.id}:loghub`);
      const serverlessCount = Math.min(s.serverless, serverlessSystems.length);
      const serverlessPicked = pickUnique(
        serverlessSystems,
        serverlessCount,
        `${BASE_SEED}:${s.id}:serverless`
      );
      return {
        input: {
          stream: { name: 'logs.mixed' },
          systems: { loghub: loghubPicked, serverless: serverlessPicked },
        },
        output: {
          criteria: buildMixedCriteria(loghubPicked, serverlessPicked),
          weight: s.weight,
        },
        metadata: {},
      } as SystemIdentificationEvaluationExample;
    });

  return [
    {
      name: 'streams: system identification mixed',
      description:
        'Seeded-random selections mixing loghub + serverless systems for various scenarios',
      examples,
    },
  ];
}

interface GeneratedDatasets {
  loghub: SystemIdentificationEvaluationDataset[];
  serverless: SystemIdentificationEvaluationDataset[];
  mixed: SystemIdentificationEvaluationDataset[];
}

async function run() {
  const log = new ToolingLog({ level: 'info', writeTo: process.stderr });
  try {
    const [loghub, serverless, mixed] = await Promise.all([
      getLoghubDatasets(),
      getServerlessDatasets({ log }),
      getMixedDatasets(),
    ]);

    const result: GeneratedDatasets = { loghub, serverless, mixed };
    process.stdout.write(JSON.stringify(result, null, 2));
  } catch (err) {
    log.error(err);
    process.exitCode = 1;
  }
}

run();
