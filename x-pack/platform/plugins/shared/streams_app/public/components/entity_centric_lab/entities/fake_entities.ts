/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mock data shapes for the Entities lab landing page.
 *
 * Nothing here roundtrips through an API — `buildFakeEntities` returns a
 * deterministic set of entities every render, sliced into the categories
 * we want to surface in the design. Sub-categories (e.g. Kubernetes ->
 * Nodes / Pods / ...) are modeled via the `type` field.
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
  /** Optional icon used by the side-nav + headers (EUI icon name). */
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

export interface Entity {
  readonly id: string;
  readonly name: string;
  readonly category: EntityCategoryId;
  /** Free-form display string (e.g. "K8s cluster", "Other type 1", "Postgres"). */
  readonly type: string;
  readonly health: EntityHealth;
  readonly lastHealthChange: string;
  readonly age: string;
  readonly anomalyDetection: string;
}

/**
 * Per-category totals shown in the side-nav (the table only renders the
 * first ~6 rows of each category — these totals reflect the "true" count
 * that the design teases with "8,095 Entities").
 */
export interface EntityCategoryCounts {
  readonly category: EntityCategoryId;
  readonly total: number;
  /** Optional sub-counts (Kubernetes uses these for Nodes/Pods/...). */
  readonly subCounts?: ReadonlyArray<{ readonly label: string; readonly total: number }>;
}

const HEALTH_SEQUENCE: readonly EntityHealth[] = [
  'unhealthy',
  'unhealthy',
  'atRisk',
  'atRisk',
  'atRisk',
  'healthy',
  'healthy',
  'healthy',
  'healthy',
  'healthy',
  'healthy',
  'healthy',
];

const pickHealth = (index: number): EntityHealth => HEALTH_SEQUENCE[index % HEALTH_SEQUENCE.length];

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

const buildEntities = (
  category: EntityCategoryId,
  rows: ReadonlyArray<{ name: string; type: string }>
): Entity[] =>
  rows.map((row, index) => ({
    id: `${category}-${index + 1}`,
    name: row.name,
    category,
    type: row.type,
    health: pickHealth(index),
    lastHealthChange: '2026-04-14 12:34',
    age: AGE_SAMPLES[index % AGE_SAMPLES.length],
    anomalyDetection: ANOMALY_SAMPLES[index % ANOMALY_SAMPLES.length],
  }));

const HOST_ROWS = [
  { name: 'hostName1', type: 'K8s cluster' },
  { name: 'hostName2', type: 'K8s cluster' },
  { name: 'hostName3', type: 'K8s cluster' },
  { name: 'hostName4', type: 'Other type 1' },
  { name: 'hostName5', type: 'Other type 1' },
  { name: 'hostName6', type: 'Database' },
];

const K8S_NODE_ROWS = [
  { name: 'node-checkout-1', type: 'K8s node' },
  { name: 'node-checkout-2', type: 'K8s node' },
  { name: 'node-payments-1', type: 'K8s node' },
  { name: 'node-search-1', type: 'K8s node' },
];

const DATABASE_ROWS = [
  { name: 'pg-checkout-primary', type: 'Postgres' },
  { name: 'pg-checkout-replica', type: 'Postgres' },
  { name: 'mysql-orders', type: 'MySQL' },
  { name: 'elastic-logs', type: 'Elasticsearch' },
];

const SERVICE_ROWS = [
  { name: 'checkout', type: 'APM service' },
  { name: 'cart', type: 'APM service' },
  { name: 'frontend', type: 'APM service' },
  { name: 'payments', type: 'APM service' },
];

const CLOUD_ROWS = [
  { name: 'aws-prod-us-east-1', type: 'AWS region' },
  { name: 'gcp-prod-europe-west', type: 'GCP region' },
];

const MIDDLEWARE_ROWS = [
  { name: 'rabbitmq-orders', type: 'RabbitMQ' },
  { name: 'kafka-events', type: 'Kafka' },
];

const LLM_ROWS = [
  { name: 'gpt-4o-summaries', type: 'OpenAI' },
  { name: 'claude-3-5-sonnet', type: 'Anthropic' },
];

export interface FakeEntitiesDataset {
  readonly entities: readonly Entity[];
  readonly categoryCounts: ReadonlyArray<EntityCategoryCounts>;
  readonly totalEntities: number;
  readonly totalGroups: number;
}

export const buildFakeEntities = (): FakeEntitiesDataset => {
  const entities: Entity[] = [
    ...buildEntities('hosts', HOST_ROWS),
    ...buildEntities('kubernetes', K8S_NODE_ROWS),
    ...buildEntities('databases', DATABASE_ROWS),
    ...buildEntities('services', SERVICE_ROWS),
    ...buildEntities('cloud', CLOUD_ROWS),
    ...buildEntities('middlewares', MIDDLEWARE_ROWS),
    ...buildEntities('llms', LLM_ROWS),
  ];

  const categoryCounts: EntityCategoryCounts[] = [
    {
      category: 'hosts',
      total: 1287,
    },
    {
      category: 'kubernetes',
      total: 4216,
      subCounts: [
        { label: 'Clusters', total: 12 },
        { label: 'Nodes', total: 184 },
        { label: 'Namespaces', total: 92 },
        { label: 'Pods', total: 2310 },
        { label: 'Deployments', total: 410 },
        { label: 'Containers', total: 1208 },
      ],
    },
    { category: 'databases', total: 213 },
    { category: 'services', total: 1042 },
    { category: 'cloud', total: 89 },
    { category: 'middlewares', total: 156 },
    { category: 'llms', total: 31 },
  ];

  const totalEntities = categoryCounts.reduce((sum, cat) => sum + cat.total, 0);

  return {
    entities,
    categoryCounts,
    totalEntities,
    totalGroups: categoryCounts.length,
  };
};

/**
 * Width of the colored-square grid used by the grouped view (and by the
 * Kubernetes sub-rows). Per-tile health is derived deterministically from
 * the cell index + a per-category seed so the same dataset paints the
 * same picture between renders.
 */
export interface HealthTileSeed {
  readonly key: string;
  readonly count: number;
  readonly bias: number;
}

const seededHealth = (seed: number, index: number): EntityHealth => {
  const value = (seed * 31 + index * 17) % 100;
  if (value < 18) return 'unhealthy';
  if (value < 40) return 'atRisk';
  return 'healthy';
};

export const generateHealthTiles = (seed: HealthTileSeed): EntityHealth[] =>
  Array.from({ length: seed.count }, (_, index) => seededHealth(seed.bias + index * 3, index));
