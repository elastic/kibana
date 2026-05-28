/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mock data shapes for the Entities lab landing page.
 *
 * `buildFakeEntities` returns a fully materialised set of entities — sized
 * by the category counts the design teases. Each entity carries deterministic
 * tags (application / environment / team / region) so the UI can offer real
 * filtering. Both the list view and the heatmap project from the same array,
 * so counts and tile↔row identities are guaranteed consistent.
 */

export type EntityHealth = 'healthy' | 'atRisk' | 'unhealthy';

export type EntityCategoryId =
  | 'hosts'
  | 'kubernetes'
  | 'databases'
  | 'services'
  | 'cloud'
  | 'middlewares'
  | 'llms';

export interface EntityCategoryDescriptor {
  readonly id: EntityCategoryId;
  readonly label: string;
  readonly icon: string;
}

export const ENTITY_CATEGORIES: readonly EntityCategoryDescriptor[] = [
  { id: 'hosts', label: 'Hosts', icon: 'storage' },
  { id: 'kubernetes', label: 'Kubernetes', icon: 'logoKubernetes' },
  { id: 'databases', label: 'Databases', icon: 'database' },
  { id: 'services', label: 'Services', icon: 'apmApp' },
  { id: 'cloud', label: 'Cloud', icon: 'cloudSunny' },
  { id: 'middlewares', label: 'Middlewares', icon: 'logstashIf' },
  { id: 'llms', label: 'LLMs', icon: 'sparkles' },
];

export const getCategoryDescriptor = (id: EntityCategoryId): EntityCategoryDescriptor | undefined =>
  ENTITY_CATEGORIES.find((category) => category.id === id);

export const TAG_KEYS = ['application', 'environment', 'team', 'region'] as const;
export type TagKey = (typeof TAG_KEYS)[number];

export const TAG_KEY_LABEL: Record<TagKey, string> = {
  application: 'Application',
  environment: 'Environment',
  team: 'Team',
  region: 'Region',
};

export type EntityTags = Record<TagKey, string>;

export interface Entity {
  readonly id: string;
  readonly name: string;
  readonly category: EntityCategoryId;
  /** Free-form display string (e.g. "K8s cluster", "Postgres", "APM service"). */
  readonly type: string;
  /** Sub-grouping for Kubernetes: "Clusters", "Nodes", "Namespaces", etc. */
  readonly subType?: string;
  readonly health: EntityHealth;
  readonly lastHealthChange: string;
  readonly age: string;
  readonly anomalyDetection: string;
  readonly tags: EntityTags;
}

export interface EntityCategoryCounts {
  readonly category: EntityCategoryId;
  readonly total: number;
  readonly subCounts?: ReadonlyArray<{ readonly label: string; readonly total: number }>;
}

export interface FakeEntitiesDataset {
  readonly entities: readonly Entity[];
  readonly categoryCounts: ReadonlyArray<EntityCategoryCounts>;
  readonly totalEntities: number;
  readonly totalGroups: number;
}

const HEALTH_RANK: Record<EntityHealth, number> = {
  unhealthy: 0,
  atRisk: 1,
  healthy: 2,
};

const seededHealth = (seed: number, index: number): EntityHealth => {
  const value = (seed * 31 + index * 17) % 100;
  if (value < 18) return 'unhealthy';
  if (value < 40) return 'atRisk';
  return 'healthy';
};

const ANOMALY_SAMPLES: readonly string[] = [
  'AI based insight about trends',
  'CPU utilization +300% last 15 min',
  'Memory growth correlated with deploy',
  'P95 latency drifting upward',
  'No anomalies detected',
  'Error rate spike on /checkout',
];

const AGE_SAMPLES: readonly string[] = [
  '5 hours',
  '12 minutes',
  '5 minutes',
  '2 days',
  '14 days',
  '38 days',
];

const APPLICATION_VALUES: readonly string[] = [
  'my-app',
  'checkout',
  'payments',
  'search',
  'frontend',
  'platform',
];

const ENVIRONMENT_VALUES: readonly string[] = ['production', 'staging', 'development'];

const TEAM_VALUES: readonly string[] = ['observability', 'platform', 'payments', 'search', 'web'];

const REGION_VALUES: readonly string[] = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
];

const TAG_POOLS: Record<TagKey, readonly string[]> = {
  application: APPLICATION_VALUES,
  environment: ENVIRONMENT_VALUES,
  team: TEAM_VALUES,
  region: REGION_VALUES,
};

// Tiny string hash used purely as a deterministic per-category salt. The
// distribution doesn't need to be cryptographic, just stable across renders.
const stableHash = (input: string): number => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

const pickFromPool = (pool: readonly string[], salt: number, index: number): string =>
  pool[(salt + index * 31) % pool.length];

const buildTags = (categorySalt: number, index: number): EntityTags => ({
  application: pickFromPool(APPLICATION_VALUES, categorySalt + 1, index),
  environment: pickFromPool(ENVIRONMENT_VALUES, categorySalt + 2, Math.floor(index / 2)),
  team: pickFromPool(TEAM_VALUES, categorySalt + 3, Math.floor(index / 3)),
  region: pickFromPool(REGION_VALUES, categorySalt + 4, Math.floor(index / 5)),
});

interface SeedRow {
  readonly name: string;
  readonly type: string;
}

interface CategorySpec {
  readonly category: EntityCategoryId;
  readonly total: number;
  readonly typeCycle: readonly string[];
  readonly seedRows: readonly SeedRow[];
  readonly fallbackName: (index: number) => string;
}

interface KubernetesSubSpec {
  readonly label: string;
  readonly total: number;
  readonly type: string;
  readonly seedRows: readonly SeedRow[];
  readonly fallbackName: (index: number) => string;
}

const padIndex = (index: number, width = 4): string => String(index + 1).padStart(width, '0');

const HOST_SEED_ROWS: readonly SeedRow[] = [
  { name: 'hostName1', type: 'K8s cluster' },
  { name: 'hostName2', type: 'K8s cluster' },
  { name: 'hostName3', type: 'K8s cluster' },
  { name: 'hostName4', type: 'Other type 1' },
  { name: 'hostName5', type: 'Other type 1' },
  { name: 'hostName6', type: 'Database' },
];

const DATABASE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'pg-checkout-primary', type: 'Postgres' },
  { name: 'pg-checkout-replica', type: 'Postgres' },
  { name: 'mysql-orders', type: 'MySQL' },
  { name: 'elastic-logs', type: 'Elasticsearch' },
];

const SERVICE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'checkout', type: 'APM service' },
  { name: 'cart', type: 'APM service' },
  { name: 'frontend', type: 'APM service' },
  { name: 'payments', type: 'APM service' },
];

const CLOUD_SEED_ROWS: readonly SeedRow[] = [
  { name: 'aws-prod-us-east-1', type: 'AWS region' },
  { name: 'gcp-prod-europe-west', type: 'GCP region' },
];

const MIDDLEWARE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'rabbitmq-orders', type: 'RabbitMQ' },
  { name: 'kafka-events', type: 'Kafka' },
];

const LLM_SEED_ROWS: readonly SeedRow[] = [
  { name: 'gpt-4o-summaries', type: 'OpenAI' },
  { name: 'claude-3-5-sonnet', type: 'Anthropic' },
];

const NON_KUBERNETES_SPECS: readonly CategorySpec[] = [
  {
    category: 'hosts',
    total: 1287,
    typeCycle: ['K8s cluster', 'Other type 1', 'Database', 'VM', 'Bare-metal'],
    seedRows: HOST_SEED_ROWS,
    fallbackName: (index) => `host-${padIndex(index)}`,
  },
  {
    category: 'databases',
    total: 213,
    typeCycle: ['Postgres', 'MySQL', 'Elasticsearch', 'Redis', 'MongoDB'],
    seedRows: DATABASE_SEED_ROWS,
    fallbackName: (index) => `db-${padIndex(index)}`,
  },
  {
    category: 'services',
    total: 1042,
    typeCycle: ['APM service'],
    seedRows: SERVICE_SEED_ROWS,
    fallbackName: (index) => `svc-${padIndex(index)}`,
  },
  {
    category: 'cloud',
    total: 89,
    typeCycle: ['AWS region', 'GCP region', 'Azure region'],
    seedRows: CLOUD_SEED_ROWS,
    fallbackName: (index) => `cloud-${padIndex(index, 3)}`,
  },
  {
    category: 'middlewares',
    total: 156,
    typeCycle: ['RabbitMQ', 'Kafka', 'Redis Streams'],
    seedRows: MIDDLEWARE_SEED_ROWS,
    fallbackName: (index) => `mw-${padIndex(index, 3)}`,
  },
  {
    category: 'llms',
    total: 31,
    typeCycle: ['OpenAI', 'Anthropic', 'Google'],
    seedRows: LLM_SEED_ROWS,
    fallbackName: (index) => `llm-${padIndex(index, 2)}`,
  },
];

const KUBERNETES_NODE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'node-checkout-1', type: 'K8s node' },
  { name: 'node-checkout-2', type: 'K8s node' },
  { name: 'node-payments-1', type: 'K8s node' },
  { name: 'node-search-1', type: 'K8s node' },
];

const KUBERNETES_SUB_SPECS: readonly KubernetesSubSpec[] = [
  {
    label: 'Clusters',
    total: 12,
    type: 'K8s cluster',
    seedRows: [],
    fallbackName: (index) => `cluster-${padIndex(index, 2)}`,
  },
  {
    label: 'Nodes',
    total: 184,
    type: 'K8s node',
    seedRows: KUBERNETES_NODE_SEED_ROWS,
    fallbackName: (index) => `node-${padIndex(index, 3)}`,
  },
  {
    label: 'Namespaces',
    total: 92,
    type: 'K8s namespace',
    seedRows: [],
    fallbackName: (index) => `ns-${padIndex(index, 3)}`,
  },
  {
    label: 'Pods',
    total: 2310,
    type: 'K8s pod',
    seedRows: [],
    fallbackName: (index) => `pod-${padIndex(index)}`,
  },
  {
    label: 'Deployments',
    total: 410,
    type: 'K8s deployment',
    seedRows: [],
    fallbackName: (index) => `deployment-${padIndex(index, 3)}`,
  },
  {
    label: 'Containers',
    total: 1208,
    type: 'K8s container',
    seedRows: [],
    fallbackName: (index) => `container-${padIndex(index)}`,
  },
];

const sortByHealth = (entities: Entity[]): Entity[] =>
  entities.sort((a, b) => {
    const healthDelta = HEALTH_RANK[a.health] - HEALTH_RANK[b.health];
    return healthDelta !== 0 ? healthDelta : a.name.localeCompare(b.name);
  });

const buildCategoryEntities = (spec: CategorySpec): Entity[] => {
  const salt = stableHash(spec.category);
  const entities: Entity[] = [];
  for (let i = 0; i < spec.total; i++) {
    const seed = spec.seedRows[i];
    const name = seed?.name ?? spec.fallbackName(i);
    const type = seed?.type ?? spec.typeCycle[i % spec.typeCycle.length];
    entities.push({
      id: `${spec.category}-${i + 1}`,
      name,
      category: spec.category,
      type,
      health: seededHealth(salt + i * 3, i),
      lastHealthChange: '2026-04-14 12:34',
      age: AGE_SAMPLES[i % AGE_SAMPLES.length],
      anomalyDetection: ANOMALY_SAMPLES[i % ANOMALY_SAMPLES.length],
      tags: buildTags(salt, i),
    });
  }
  return sortByHealth(entities);
};

const buildKubernetesEntities = (): Entity[] => {
  const salt = stableHash('kubernetes');
  const entities: Entity[] = [];
  let runningOffset = 0;
  for (const sub of KUBERNETES_SUB_SPECS) {
    const subEntities: Entity[] = [];
    for (let i = 0; i < sub.total; i++) {
      const seed = sub.seedRows[i];
      const name = seed?.name ?? sub.fallbackName(i);
      const globalIndex = runningOffset + i;
      subEntities.push({
        id: `kubernetes-${sub.label.toLowerCase()}-${i + 1}`,
        name,
        category: 'kubernetes',
        subType: sub.label,
        type: sub.type,
        health: seededHealth(salt + globalIndex * 3, globalIndex),
        lastHealthChange: '2026-04-14 12:34',
        age: AGE_SAMPLES[i % AGE_SAMPLES.length],
        anomalyDetection: ANOMALY_SAMPLES[i % ANOMALY_SAMPLES.length],
        tags: buildTags(salt + sub.label.length, globalIndex),
      });
    }
    entities.push(...sortByHealth(subEntities));
    runningOffset += sub.total;
  }
  return entities;
};

export const buildFakeEntities = (): FakeEntitiesDataset => {
  const entities: Entity[] = [
    ...buildCategoryEntities(NON_KUBERNETES_SPECS[0]), // hosts
    ...buildKubernetesEntities(),
    ...buildCategoryEntities(NON_KUBERNETES_SPECS[1]), // databases
    ...buildCategoryEntities(NON_KUBERNETES_SPECS[2]), // services
    ...buildCategoryEntities(NON_KUBERNETES_SPECS[3]), // cloud
    ...buildCategoryEntities(NON_KUBERNETES_SPECS[4]), // middlewares
    ...buildCategoryEntities(NON_KUBERNETES_SPECS[5]), // llms
  ];

  const categoryCounts: EntityCategoryCounts[] = ENTITY_CATEGORIES.map((descriptor) => {
    if (descriptor.id === 'kubernetes') {
      return {
        category: 'kubernetes' as const,
        total: KUBERNETES_SUB_SPECS.reduce((sum, sub) => sum + sub.total, 0),
        subCounts: KUBERNETES_SUB_SPECS.map((sub) => ({ label: sub.label, total: sub.total })),
      };
    }
    const spec = NON_KUBERNETES_SPECS.find((s) => s.category === descriptor.id);
    return { category: descriptor.id, total: spec?.total ?? 0 };
  });

  return {
    entities,
    categoryCounts,
    totalEntities: entities.length,
    totalGroups: categoryCounts.length,
  };
};

/**
 * Returns the set of unique values seen for each tag key across the supplied
 * entities, sorted alphabetically. Used to populate the filter popovers — the
 * pools above are the source of truth for which values *can* appear, but the
 * facets ensure we only surface values that actually exist in the dataset.
 */
export const getTagFacets = (entities: readonly Entity[]): Record<TagKey, string[]> => {
  const facets: Record<TagKey, Set<string>> = {
    application: new Set<string>(),
    environment: new Set<string>(),
    team: new Set<string>(),
    region: new Set<string>(),
  };
  for (const entity of entities) {
    for (const key of TAG_KEYS) {
      facets[key].add(entity.tags[key]);
    }
  }
  return {
    application: Array.from(facets.application).sort(),
    environment: Array.from(facets.environment).sort(),
    team: Array.from(facets.team).sort(),
    region: Array.from(facets.region).sort(),
  };
};

export type ActiveTagFilters = Record<TagKey, readonly string[]>;

export const EMPTY_TAG_FILTERS: ActiveTagFilters = {
  application: [],
  environment: [],
  team: [],
  region: [],
};

export const isAnyFilterActive = (filters: ActiveTagFilters): boolean =>
  TAG_KEYS.some((key) => filters[key].length > 0);

export const matchesTagFilters = (entity: Entity, filters: ActiveTagFilters): boolean => {
  for (const key of TAG_KEYS) {
    const values = filters[key];
    if (values.length > 0 && !values.includes(entity.tags[key])) {
      return false;
    }
  }
  return true;
};

export { TAG_POOLS };
