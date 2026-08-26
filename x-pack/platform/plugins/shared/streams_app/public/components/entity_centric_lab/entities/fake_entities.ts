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

import { CLOUD_PROVIDERS, type CloudProviderId } from './cloud_providers';

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
  /**
   * Sub-grouping label. Kubernetes uses it for "Clusters", "Nodes",
   * "Namespaces", …; Cloud uses it for the service label ("EC2",
   * "Lambda", …) so the provider > service hierarchy can group off it.
   */
  readonly subType?: string;
  /** Cloud provider owner (`aws` / `gcp` / `azure`), set only on cloud entities. */
  readonly provider?: CloudProviderId;
  readonly health: EntityHealth;
  readonly lastHealthChange: string;
  readonly age: string;
  readonly anomalyDetection: string;
  readonly tags: EntityTags;
  /**
   * Extra, entity-type-specific attributes (e.g. Hosts carry
   * `os` / `cloudProvider` / `serviceName`). These power the per-category
   * "extra filters" shown to the right of the shared tag filters — see
   * {@link CATEGORY_EXTRA_FILTERS}. Only seeded for categories that declare
   * extra filters; `undefined` elsewhere.
   */
  readonly attributes?: Readonly<Record<string, string>>;
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

/**
 * Severity ordering for health, most-anomalous first. Exported so
 * surfaces like the list view can sort rows red → yellow → green
 * ("show me what's broken first") instead of alphabetically by the
 * raw health string.
 */
export const HEALTH_RANK: Record<EntityHealth, number> = {
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

// Broadened from the original EU-only pair to a global spread so the
// Geomap view has donuts scattered across continents (instead of two
// markers stacked over Europe). Purely a demo-dataset concern — the
// values still flow through the same tag facets / filters as before.
const REGION_VALUES: readonly string[] = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1',
  'sa-east-1',
  'af-south-1',
];

const TAG_POOLS: Record<TagKey, readonly string[]> = {
  application: APPLICATION_VALUES,
  environment: ENVIRONMENT_VALUES,
  team: TEAM_VALUES,
  region: REGION_VALUES,
};

/**
 * Definition of one entity-type-specific "extra" filter. These render to the
 * right of the shared tag filters (Team / Application / …) whenever the
 * inventory is scoped to the owning category, mirroring how the real Hosts /
 * inventory views expose type-specific facets (Operating System, Cloud
 * Provider, Service Name, …). `pool` is the source of truth for the values a
 * category's entities can carry; the popover only surfaces values that
 * actually occur (see {@link getExtraFacets}).
 */
export interface ExtraFilterDef {
  readonly key: string;
  readonly label: string;
  /** Optional helper text rendered inside the filter popover. */
  readonly help?: string;
  readonly pool: readonly string[];
}

const HOST_OS_VALUES: readonly string[] = [
  'Ubuntu 22.04 LTS',
  'Amazon Linux 2',
  'RHEL 9',
  'Windows Server 2019',
  'Debian 12',
];

const HOST_CLOUD_PROVIDER_VALUES: readonly string[] = ['AWS', 'GCP', 'Azure', 'On-prem'];

const HOST_SERVICE_NAME_VALUES: readonly string[] = [
  'nginx',
  'postgres',
  'redis',
  'kafka',
  'elasticsearch',
  'mongodb',
];

/**
 * Per-category extra filters. Add an entry here (plus, if you want them to
 * filter something real, seed the matching attributes in the builders below)
 * to expose type-specific facets on that category's inventory page.
 */
export const CATEGORY_EXTRA_FILTERS: Partial<Record<EntityCategoryId, readonly ExtraFilterDef[]>> = {
  hosts: [
    { key: 'os', label: 'Operating system', pool: HOST_OS_VALUES },
    { key: 'cloudProvider', label: 'Cloud provider', pool: HOST_CLOUD_PROVIDER_VALUES },
    {
      key: 'serviceName',
      label: 'Service name',
      help: 'Services detected running on the host (from the system integration).',
      pool: HOST_SERVICE_NAME_VALUES,
    },
  ],
};

/** Extra filters declared for a category, or an empty list when none. */
export const getCategoryExtraFilters = (category: EntityCategoryId): readonly ExtraFilterDef[] =>
  CATEGORY_EXTRA_FILTERS[category] ?? [];

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

// Deterministically seed the extra, category-specific attributes (e.g. a
// host's OS / cloud provider / detected service) from each filter def's pool,
// using the same independent-hash scheme as tags so values are stable and
// uncorrelated. Returns `undefined` for categories with no extra filters.
const buildExtraAttributes = (
  category: EntityCategoryId,
  scope: string,
  index: number
): Record<string, string> | undefined => {
  const defs = CATEGORY_EXTRA_FILTERS[category];
  if (!defs || defs.length === 0) return undefined;
  const attributes: Record<string, string> = {};
  for (const def of defs) {
    attributes[def.key] = pickTag(def.pool, `${scope}-${def.key}`, index);
  }
  return attributes;
};

// One region is deliberately "on fire" so the Geomap view tells a clear
// story: a single all-red donut while every other region reads
// green/yellow. Everything else in the app follows the same dataset, so
// the ailing region stands out in the grid/list too.
const AILING_REGION = 'sa-east-1';

/**
 * Bend an entity's rolled health to fit its region:
 *   - anything in {@link AILING_REGION} is forced `unhealthy` (red), and
 *   - every other region is clamped to green/yellow (a rolled `unhealthy`
 *     is softened to `atRisk`),
 * so the map shows exactly one red region and the rest healthy-ish.
 */
const regionAdjustedHealth = (base: EntityHealth, region: string): EntityHealth => {
  if (region === AILING_REGION) return 'unhealthy';
  return base === 'unhealthy' ? 'atRisk' : base;
};

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
    const tags = buildTags(spec.category, i);
    const baseHealth = seed?.health ?? seededHealth(salt + i * 3, i);
    entities.push({
      id: `${spec.category}-${i + 1}`,
      name,
      category: spec.category,
      type,
      health: regionAdjustedHealth(baseHealth, tags.region),
      lastHealthChange: '2026-04-14 12:34',
      age: AGE_SAMPLES[i % AGE_SAMPLES.length],
      anomalyDetection: ANOMALY_SAMPLES[i % ANOMALY_SAMPLES.length],
      tags,
      attributes: buildExtraAttributes(spec.category, spec.category, i),
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
      const tags = buildTags(`kubernetes-${sub.label}`, globalIndex);
      const baseHealth = seed?.health ?? seededHealth(salt + globalIndex * 3, globalIndex);
      subEntities.push({
        id: `kubernetes-${sub.label.toLowerCase()}-${i + 1}`,
        name,
        category: 'kubernetes',
        subType: sub.label,
        type: sub.type,
        health: regionAdjustedHealth(baseHealth, tags.region),
        lastHealthChange: '2026-04-14 12:34',
        age: AGE_SAMPLES[i % AGE_SAMPLES.length],
        anomalyDetection: ANOMALY_SAMPLES[i % ANOMALY_SAMPLES.length],
        tags,
      });
    }
    entities.push(...sortByHealth(subEntities));
    runningOffset += sub.total;
  }
  return entities;
};

/**
 * Cloud entities are generated from the {@link CLOUD_PROVIDERS} taxonomy
 * rather than a flat seed list so the provider > service hierarchy stays
 * the single source of truth. Every entity carries `provider` (aws / gcp
 * / azure) and `subType` (the service label, e.g. "EC2") so the nav,
 * routes, and grid/list grouping can all key off the same fields.
 */
const buildCloudEntities = (): Entity[] => {
  const entities: Entity[] = [];
  let index = 0;
  for (const provider of CLOUD_PROVIDERS) {
    for (const service of provider.services) {
      const serviceEntities: Entity[] = [];
      for (const instance of service.instances) {
        const tags = buildTags(`cloud-${provider.id}`, index);
        serviceEntities.push({
          id: `cloud-${provider.id}-${service.id}-${index + 1}`,
          name: instance.name,
          category: 'cloud',
          provider: provider.id,
          subType: service.label,
          type: service.entityType,
          health: regionAdjustedHealth(instance.health, tags.region),
          lastHealthChange: '2026-04-14 12:34',
          age: AGE_SAMPLES[index % AGE_SAMPLES.length],
          anomalyDetection: ANOMALY_SAMPLES[index % ANOMALY_SAMPLES.length],
          tags,
        });
        index += 1;
      }
      entities.push(...sortByHealth(serviceEntities));
    }
  }
  return entities;
};

const CLOUD_TOTAL = CLOUD_PROVIDERS.reduce(
  (sum, provider) =>
    sum +
    provider.services.reduce((serviceSum, service) => serviceSum + service.instances.length, 0),
  0
);

const findSpec = (category: EntityCategoryId): CategorySpec => {
  const spec = NON_KUBERNETES_SPECS.find((candidate) => candidate.category === category);
  if (!spec) {
    throw new Error(`No CategorySpec registered for category "${category}"`);
  }
  return spec;
};

export const buildFakeEntities = (): FakeEntitiesDataset => {
  const entities: Entity[] = [
    ...buildCategoryEntities(findSpec('hosts')),
    ...buildKubernetesEntities(),
    ...buildCategoryEntities(findSpec('databases')),
    ...buildCategoryEntities(findSpec('services')),
    ...buildCloudEntities(),
    ...buildCategoryEntities(findSpec('middlewares')),
    ...buildCategoryEntities(findSpec('llms')),
  ];

  const categoryCounts: EntityCategoryCounts[] = ENTITY_CATEGORIES.map((descriptor) => {
    if (descriptor.id === 'kubernetes') {
      return {
        category: 'kubernetes' as const,
        total: KUBERNETES_SUB_SPECS.reduce((sum, sub) => sum + sub.total, 0),
        subCounts: KUBERNETES_SUB_SPECS.map((sub) => ({ label: sub.label, total: sub.total })),
      };
    }
    if (descriptor.id === 'cloud') {
      return {
        category: 'cloud' as const,
        total: CLOUD_TOTAL,
        subCounts: CLOUD_PROVIDERS.map((provider) => ({
          label: provider.label,
          total: provider.services.reduce((sum, service) => sum + service.instances.length, 0),
        })),
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

export type ActiveExtraFilters = Record<string, readonly string[]>;

export const EMPTY_EXTRA_FILTERS: ActiveExtraFilters = {};

/**
 * Distinct values actually present for each extra-filter def across the
 * supplied (already category-scoped) entities, alphabetically sorted — the
 * source data for the extra filter popovers.
 */
export const getExtraFacets = (
  entities: readonly Entity[],
  defs: readonly ExtraFilterDef[]
): Record<string, string[]> => {
  const sets = new Map<string, Set<string>>(defs.map((def) => [def.key, new Set<string>()]));
  for (const entity of entities) {
    if (!entity.attributes) continue;
    for (const def of defs) {
      const value = entity.attributes[def.key];
      if (value) sets.get(def.key)!.add(value);
    }
  }
  const facets: Record<string, string[]> = {};
  for (const def of defs) {
    facets[def.key] = Array.from(sets.get(def.key)!).sort();
  }
  return facets;
};

export const isAnyExtraFilterActive = (filters: ActiveExtraFilters): boolean =>
  Object.values(filters).some((values) => values.length > 0);

/**
 * Honors the active extra filters, but only for keys declared by `defs` — so a
 * selection made on one category can't silently filter another after
 * navigation (stale keys are ignored rather than blanking the grid).
 */
export const matchesExtraFilters = (
  entity: Entity,
  filters: ActiveExtraFilters,
  defs: readonly ExtraFilterDef[]
): boolean => {
  for (const def of defs) {
    const values = filters[def.key];
    if (values && values.length > 0) {
      const actual = entity.attributes?.[def.key];
      if (!actual || !values.includes(actual)) return false;
    }
  }
  return true;
};

export { TAG_POOLS };
