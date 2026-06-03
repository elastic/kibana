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
  | 'llms'
  // Catch-all bucket for entity types whose `category` field doesn't
  // match any of the canonical labels above (user-typed via the
  // wizard's "+ Create new category", legacy seed values, …). Lives
  // here on the closed enum so route validation, nav and the manage
  // table all agree on the same set of categories.
  | 'other';

export interface EntityCategoryDescriptor {
  readonly id: EntityCategoryId;
  readonly label: string;
  readonly icon: string;
}

/**
 * Single source of truth for category id + display label + icon.
 *
 * Drives:
 *   - The left-nav "Entities" panel children (deep-link ids match the
 *     `id` field via `entities${PascalCase(id)}`).
 *   - The Grouped grid + List + Map views (one card per entry).
 *   - The wizard's category dropdown in the "Manage entity types"
 *     create / edit flyout (we filter out `'other'` since that bucket
 *     is what users land in *implicitly* via "+ Create new category",
 *     not something they'd pick explicitly).
 *   - The manage-table category column display logic
 *     (`getCanonicalCategoryLabel`).
 *
 * Add a new canonical category by:
 *   1. extending `EntityCategoryId` and this array,
 *   2. adding a matching deep-link in `streams_app/public/plugin.tsx`,
 *   3. registering it in `navigation_tree.ts`,
 *   4. (optionally) seeding entity instances + entity types so the
 *      new nav section isn't empty.
 */
export const ENTITY_CATEGORIES: readonly EntityCategoryDescriptor[] = [
  { id: 'hosts', label: 'Hosts', icon: 'storage' },
  { id: 'kubernetes', label: 'Kubernetes', icon: 'logoKubernetes' },
  { id: 'databases', label: 'Databases', icon: 'database' },
  { id: 'services', label: 'Services', icon: 'apmApp' },
  { id: 'cloud', label: 'Cloud', icon: 'cloudSunny' },
  { id: 'middlewares', label: 'Middlewares', icon: 'logstashIf' },
  { id: 'llms', label: 'LLMs', icon: 'sparkles' },
  // Catch-all bucket — rendered as a nav section so user-typed
  // categories aren't invisible, but never offered as a dropdown
  // option in the wizard (the wizard exposes the 7 canonical
  // categories + "+ Create new category" instead).
  { id: 'other', label: 'Other', icon: 'package' },
];

export const getCategoryDescriptor = (id: EntityCategoryId): EntityCategoryDescriptor | undefined =>
  ENTITY_CATEGORIES.find((category) => category.id === id);

/**
 * Type-narrowing guard for route params, where the category segment is a
 * plain `string` until we've checked it against the canonical list.
 */
export const isKnownCategoryId = (value: string): value is EntityCategoryId =>
  ENTITY_CATEGORIES.some((category) => category.id === value);

/**
 * Map any free-form "category" string (the user-typed value on a
 * `FakeEntityType.category` field, or a wizard draft, or a legacy
 * seed value) to its canonical `EntityCategoryId`. Tries:
 *   1. exact slug match (already canonical, just narrowing),
 *   2. label match (case-insensitive, e.g. `"Kubernetes"` ↔ `"kubernetes"`),
 *   3. fallback to `'other'`.
 * Empty / nullish input also falls back to `'other'` — keeps the
 * manage-table category column from rendering blank cells.
 */
export const normalizeCategoryToId = (raw: string | undefined | null): EntityCategoryId => {
  if (!raw) return 'other';
  const trimmed = raw.trim();
  if (trimmed.length === 0) return 'other';
  const lower = trimmed.toLowerCase();
  // Slug match first — cheaper than scanning labels and covers the
  // common case where callers already pass an `EntityCategoryId`.
  const bySlug = ENTITY_CATEGORIES.find((category) => category.id === lower);
  if (bySlug) return bySlug.id;
  const byLabel = ENTITY_CATEGORIES.find((category) => category.label.toLowerCase() === lower);
  if (byLabel) return byLabel.id;
  return 'other';
};

/**
 * Resolve the canonical display label for any category string. Returns
 * the canonical `ENTITY_CATEGORIES` label when the input maps cleanly
 * (so `"kubernetes"`, `"Kubernetes"`, `"KUBERNETES"` all render as
 * `"Kubernetes"`), and the original trimmed string otherwise — that
 * way the manage-table keeps showing the user's typed-in custom
 * category label while the nav surfaces it under "Other".
 */
export const getCanonicalCategoryLabel = (raw: string | undefined | null): string => {
  if (!raw) return getCategoryDescriptor('other')?.label ?? 'Other';
  const trimmed = raw.trim();
  if (trimmed.length === 0) return getCategoryDescriptor('other')?.label ?? 'Other';
  const id = normalizeCategoryToId(trimmed);
  if (id !== 'other') return getCategoryDescriptor(id)?.label ?? trimmed;
  return trimmed;
};

/**
 * `true` when the supplied category string does not match any
 * canonical category (i.e. it would be bucketed under "Other" in the
 * left nav). Used by the manage table to mark custom-category rows
 * with a small "Other" tag.
 */
export const isCustomCategoryLabel = (raw: string | undefined | null): boolean =>
  normalizeCategoryToId(raw) === 'other';

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

/**
 * Demo-friendly health distribution. Tuned so a typical screenshot
 * of the entities list / Grouped grid shows enough warning + danger
 * badges to be visually interesting without making the dataset feel
 * like everything's on fire:
 *   - 25 % unhealthy
 *   - 30 % at risk
 *   - 45 % healthy
 * The previous 18/22/60 split made most cards look uniformly green
 * (and the heatmap tiles, which now follow the entity's health,
 * inherited the same lack of variety). 25/30/45 keeps "mostly OK"
 * as the dominant state while leaving every category with a credible
 * mix of red and yellow.
 */
const seededHealth = (seed: number, index: number): EntityHealth => {
  const value = (seed * 31 + index * 17) % 100;
  if (value < 25) return 'unhealthy';
  if (value < 55) return 'atRisk';
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

// Tag pools — tightened to match the PayFlow demo storyline. Sofia's chain
// only meaningfully exercises payments / checkout / fraud applications in
// production on the EU clusters, so the navigator filter facets reflect that.
const APPLICATION_VALUES: readonly string[] = [
  'payments',
  'checkout',
  'fraud',
  'merchant',
  'platform',
];

const ENVIRONMENT_VALUES: readonly string[] = ['production', 'staging'];

const TEAM_VALUES: readonly string[] = ['payments-team', 'platform-team', 'risk-team'];

const REGION_VALUES: readonly string[] = ['eu-west-1', 'eu-central-1'];

const TAG_POOLS: Record<TagKey, readonly string[]> = {
  application: APPLICATION_VALUES,
  environment: ENVIRONMENT_VALUES,
  team: TEAM_VALUES,
  region: REGION_VALUES,
};

// Tiny string hash used purely as a deterministic per-entity-per-tag
// pseudo-random source. Each tag is computed from a *different* string
// (e.g. "hosts-app-12", "hosts-env-12") so the resulting values are
// independent and free of the modular correlation that plagues
// `(salt + index * stride) % poolSize` schemes when pool sizes share a
// factor with the stride.
const stableHash = (input: string): number => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

const pickTag = (pool: readonly string[], scope: string, index: number): string =>
  pool[stableHash(`${scope}-${index}`) % pool.length];

const buildTags = (scope: string, index: number): EntityTags => ({
  application: pickTag(APPLICATION_VALUES, `${scope}-application`, index),
  environment: pickTag(ENVIRONMENT_VALUES, `${scope}-environment`, index),
  team: pickTag(TEAM_VALUES, `${scope}-team`, index),
  region: pickTag(REGION_VALUES, `${scope}-region`, index),
});

interface SeedRow {
  readonly name: string;
  readonly type: string;
  /**
   * Optional forced health override. When set, the seed entity ignores the
   * deterministic `seededHealth` roll — used to pin PayFlow story entities
   * (e.g. `payments-pod-7f9b2`) at `unhealthy` so they reliably surface at
   * the top of the heatmap and list view.
   */
  readonly health?: EntityHealth;
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

// PayFlow demo seeds — the four click-path entities are pinned to their
// expected health so Sofia's chain always reads the same way, regardless of
// the deterministic seed rolls.
const HOST_SEED_ROWS: readonly SeedRow[] = [
  { name: 'host-eu-prod-01', type: 'Bare-metal', health: 'healthy' },
  { name: 'host-eu-prod-02', type: 'Bare-metal', health: 'healthy' },
];

const DATABASE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'payments-db', type: 'Postgres', health: 'healthy' },
  { name: 'orders-db', type: 'Postgres', health: 'healthy' },
  { name: 'fraud-db', type: 'Postgres', health: 'healthy' },
];

// Entity `.type` is the human-readable label rendered in the "Type"
// column of the entities list and the title of the entity flyout, so
// it doubles as the Manage entity types table's `name` for the
// matching seed row in `fake_entity_types.ts`. We use the display
// label ("APM Service") instead of the ECS field name ("apm.service")
// so the two surfaces line up letter-for-letter. Kind inference in
// `kbn-entity-centric-lab-flyout/src/kind_templates.ts` is
// case-insensitive and matches both `apm.service` and `APM Service`,
// so the rename doesn't break any storyline templates.
const SERVICE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'payments-service', type: 'APM Service', health: 'unhealthy' },
  { name: 'checkout-service', type: 'APM Service', health: 'unhealthy' },
  { name: 'fraud-service', type: 'APM Service', health: 'healthy' },
  { name: 'merchant-portal', type: 'APM Service', health: 'healthy' },
  { name: 'billing-api', type: 'APM Service', health: 'healthy' },
  { name: 'settlement-service', type: 'APM Service', health: 'healthy' },
  { name: 'wallet-service', type: 'APM Service', health: 'healthy' },
  { name: 'reporting-service', type: 'APM Service', health: 'healthy' },
  { name: 'notifications-service', type: 'APM Service', health: 'healthy' },
  { name: 'identity-service', type: 'APM Service', health: 'healthy' },
  { name: 'webhooks-service', type: 'APM Service', health: 'healthy' },
  { name: 'pricing-service', type: 'APM Service', health: 'healthy' },
];

// Cloud entities cover the four AWS-flavoured types the Manage table
// exposes (regions, EC2 instances, Lambda functions, S3 buckets).
// Every entity is seeded by name so the demo never falls back to
// generic `cloud-001` placeholders, and so each of the four types in
// `fake_entity_types.ts` has the same count as what's listed here.
const CLOUD_SEED_ROWS: readonly SeedRow[] = [
  // ---------- AWS region (4) ----------
  { name: 'aws-eu-west-1', type: 'AWS region', health: 'healthy' },
  { name: 'aws-eu-central-1', type: 'AWS region', health: 'atRisk' },
  { name: 'aws-us-east-1', type: 'AWS region', health: 'healthy' },
  { name: 'aws-us-west-2', type: 'AWS region', health: 'healthy' },
  // ---------- AWS EC2 Instance (4) ----------
  { name: 'i-0a1b2c3d4e5f6789a', type: 'AWS EC2 Instance', health: 'unhealthy' },
  { name: 'i-04e5f6a708b9c1d2e', type: 'AWS EC2 Instance', health: 'healthy' },
  { name: 'i-0b9c1d2e304e5f6a7', type: 'AWS EC2 Instance', health: 'atRisk' },
  { name: 'i-0e5f6a708b9c1d2e3', type: 'AWS EC2 Instance', health: 'healthy' },
  // ---------- AWS Lambda function (4) ----------
  { name: 'orders-api-handler', type: 'AWS Lambda function', health: 'healthy' },
  { name: 'fraud-screener', type: 'AWS Lambda function', health: 'atRisk' },
  { name: 'checkout-webhook', type: 'AWS Lambda function', health: 'healthy' },
  { name: 'auth-callback', type: 'AWS Lambda function', health: 'unhealthy' },
  // ---------- AWS S3 bucket (4) ----------
  { name: 'payflow-receipts', type: 'AWS S3 bucket', health: 'healthy' },
  { name: 'payments-audit-logs', type: 'AWS S3 bucket', health: 'healthy' },
  { name: 'merchant-assets', type: 'AWS S3 bucket', health: 'healthy' },
  { name: 'analytics-exports', type: 'AWS S3 bucket', health: 'atRisk' },
];

const MIDDLEWARE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'kafka-payments', type: 'Kafka', health: 'healthy' },
  { name: 'rabbitmq-checkout', type: 'RabbitMQ', health: 'healthy' },
];

const LLM_SEED_ROWS: readonly SeedRow[] = [
  { name: 'gpt-4o-summaries', type: 'OpenAI', health: 'healthy' },
  { name: 'claude-3-5-sonnet', type: 'Anthropic', health: 'healthy' },
];

const NON_KUBERNETES_SPECS: readonly CategorySpec[] = [
  {
    category: 'hosts',
    total: 24,
    typeCycle: ['Bare-metal', 'VM'],
    seedRows: HOST_SEED_ROWS,
    fallbackName: (index) => `host-${padIndex(index, 3)}`,
  },
  {
    category: 'databases',
    total: 3,
    typeCycle: ['Postgres'],
    seedRows: DATABASE_SEED_ROWS,
    fallbackName: (index) => `db-${padIndex(index, 2)}`,
  },
  {
    category: 'services',
    total: 12,
    typeCycle: ['APM Service'],
    seedRows: SERVICE_SEED_ROWS,
    fallbackName: (index) => `svc-${padIndex(index, 2)}`,
  },
  {
    // 16 total entities — 4 per AWS sub-type — all fully seeded by
    // `CLOUD_SEED_ROWS`. Keeping seed count == total avoids relying
    // on `typeCycle` here: the fallback names (`cloud-NN`) wouldn't
    // hint at the sub-type and the table counts would drift away
    // from the actual instance counts.
    category: 'cloud',
    total: 16,
    typeCycle: ['AWS region', 'AWS EC2 Instance', 'AWS Lambda function', 'AWS S3 bucket'],
    seedRows: CLOUD_SEED_ROWS,
    fallbackName: (index) => `cloud-${padIndex(index, 2)}`,
  },
  {
    category: 'middlewares',
    total: 4,
    typeCycle: ['Kafka', 'RabbitMQ'],
    seedRows: MIDDLEWARE_SEED_ROWS,
    fallbackName: (index) => `mw-${padIndex(index, 2)}`,
  },
  {
    category: 'llms',
    total: 2,
    typeCycle: ['OpenAI', 'Anthropic'],
    seedRows: LLM_SEED_ROWS,
    fallbackName: (index) => `llm-${padIndex(index, 2)}`,
  },
];

const KUBERNETES_CLUSTER_SEED_ROWS: readonly SeedRow[] = [
  { name: 'k8s-eu-prod', type: 'K8s cluster', health: 'atRisk' },
  { name: 'k8s-us-prod', type: 'K8s cluster', health: 'healthy' },
];

const KUBERNETES_NODE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'node-prod-eu-04', type: 'K8s node', health: 'unhealthy' },
];

const KUBERNETES_NAMESPACE_SEED_ROWS: readonly SeedRow[] = [
  { name: 'payments', type: 'K8s namespace', health: 'unhealthy' },
  { name: 'checkout', type: 'K8s namespace', health: 'unhealthy' },
  { name: 'fraud', type: 'K8s namespace', health: 'healthy' },
  { name: 'settlement', type: 'K8s namespace', health: 'atRisk' },
];

const KUBERNETES_POD_SEED_ROWS: readonly SeedRow[] = [
  { name: 'payments-pod-7f9b2', type: 'K8s pod', health: 'unhealthy' },
  { name: 'batch-settlement-job-xk2p', type: 'K8s pod', health: 'atRisk' },
  { name: 'payments-pod-3ac1f', type: 'K8s pod', health: 'healthy' },
  { name: 'fraud-pod-9a1c', type: 'K8s pod', health: 'healthy' },
];

const KUBERNETES_SUB_SPECS: readonly KubernetesSubSpec[] = [
  {
    label: 'Clusters',
    total: 2,
    type: 'K8s cluster',
    seedRows: KUBERNETES_CLUSTER_SEED_ROWS,
    fallbackName: (index) => `cluster-${padIndex(index, 2)}`,
  },
  {
    label: 'Nodes',
    total: 48,
    type: 'K8s node',
    seedRows: KUBERNETES_NODE_SEED_ROWS,
    fallbackName: (index) => `node-${padIndex(index, 3)}`,
  },
  {
    label: 'Namespaces',
    total: 8,
    type: 'K8s namespace',
    seedRows: KUBERNETES_NAMESPACE_SEED_ROWS,
    fallbackName: (index) => `ns-${padIndex(index, 2)}`,
  },
  {
    label: 'Pods',
    total: 597,
    type: 'K8s pod',
    seedRows: KUBERNETES_POD_SEED_ROWS,
    fallbackName: (index) => `pod-${padIndex(index, 3)}`,
  },
  {
    label: 'Deployments',
    total: 96,
    type: 'K8s deployment',
    seedRows: [],
    fallbackName: (index) => `deployment-${padIndex(index, 3)}`,
  },
  {
    label: 'Containers',
    total: 320,
    type: 'K8s container',
    seedRows: [],
    fallbackName: (index) => `container-${padIndex(index, 3)}`,
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
      health: seed?.health ?? seededHealth(salt + i * 3, i),
      lastHealthChange: '2026-04-14 12:34',
      age: AGE_SAMPLES[i % AGE_SAMPLES.length],
      anomalyDetection: ANOMALY_SAMPLES[i % ANOMALY_SAMPLES.length],
      tags: buildTags(spec.category, i),
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
        health: seed?.health ?? seededHealth(salt + globalIndex * 3, globalIndex),
        lastHealthChange: '2026-04-14 12:34',
        age: AGE_SAMPLES[i % AGE_SAMPLES.length],
        anomalyDetection: ANOMALY_SAMPLES[i % ANOMALY_SAMPLES.length],
        tags: buildTags(`kubernetes-${sub.label}`, globalIndex),
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
