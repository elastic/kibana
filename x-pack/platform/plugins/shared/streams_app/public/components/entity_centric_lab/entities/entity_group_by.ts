/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic "Group by" support for the ElasticOn Inventory (list + hex grid).
 *
 * By default the views group entities by Category → Type (the built-in
 * layout). This module lets the user pick up to two arbitrary fields to group
 * by instead (Infra "Select up to two groupings" style). It's intentionally
 * React-free — just the field catalog + a grouping helper — so both views and
 * the saved-views module can share it without pulling in UI.
 */

import { i18n } from '@kbn/i18n';
import type { Entity, EntityCategoryId } from './fake_entities';
import {
  ENTITY_CATEGORIES,
  TAG_KEY_LABEL,
  getCategoryDescriptor,
  getCategoryExtraFilters,
  getVisibleTagKeys,
} from './fake_entities';
import { CLOUD_PROVIDERS } from './cloud_providers';

export type GroupByFieldId = string;

export interface GroupByFieldDef {
  readonly id: GroupByFieldId;
  readonly label: string;
  /** Bucket label for an entity ("Unknown" when the field is absent). */
  readonly valueOf: (entity: Entity) => string;
  /**
   * Optional canonical sort order for bucket labels. When provided,
   * buckets are ordered by the position of their label in this map
   * instead of the default count-descending sort. Labels not present
   * in the map are appended after the canonical ones, alphabetically.
   */
  readonly canonicalOrder?: ReadonlyMap<string, number>;
}

/**
 * Default grouping — reproduces the built-in Category → Type layout. When the
 * active grouping equals this, both views use their original (unchanged)
 * rendering path with the per-type metric catalogs; any other selection uses
 * the generic, health-coloured path.
 */
export const DEFAULT_GROUP_BY: readonly GroupByFieldId[] = ['category', 'type'];

const UNKNOWN = i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.unknown', {
  defaultMessage: 'Unknown',
});

/**
 * Header shown for the single bucket when the user clears the grouping entirely
 * (an empty selection = flat / ungrouped, all resources in one block).
 */
export const UNGROUPED_LABEL = i18n.translate(
  'xpack.streams.entityCentricLab.entities.groupBy.ungrouped',
  { defaultMessage: 'All resources' }
);

const HEALTH_LABEL: Record<string, string> = {
  healthy: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
};

const PROVIDER_LABEL: Record<string, string> = Object.fromEntries(
  CLOUD_PROVIDERS.map((provider) => [provider.id, provider.label])
);

/** Canonical display order for categories — mirrors the left nav / hex view. */
const CATEGORY_CANONICAL_ORDER: ReadonlyMap<string, number> = new Map(
  ENTITY_CATEGORIES.map((cat, idx) => [cat.label, idx])
);

/**
 * Canonical display order for entity types — ensures K8s sub-types
 * render in the same Clusters → Nodes → Namespaces → Deployments →
 * Pods → Containers order everywhere. Types not listed here fall back
 * to count-descending (the default).
 */
const TYPE_CANONICAL_ORDER: ReadonlyMap<string, number> = new Map([
  ['K8s cluster', 0],
  ['K8s node', 1],
  ['K8s namespace', 2],
  ['K8s deployment', 3],
  ['K8s pod', 4],
  ['K8s container', 5],
]);

const ALERT_GROUP_LABELS = {
  firing: i18n.translate(
    'xpack.streams.entityCentricLab.entities.groupBy.alerts.firing',
    { defaultMessage: 'Resources with active alerts' }
  ),
  noSetup: i18n.translate(
    'xpack.streams.entityCentricLab.entities.groupBy.alerts.noSetup',
    { defaultMessage: 'Resources with no alerts set up' }
  ),
  ok: i18n.translate(
    'xpack.streams.entityCentricLab.entities.groupBy.alerts.ok',
    { defaultMessage: 'Resources with no active alerts' }
  ),
};

/** Canonical sort: firing first, then no setup, then OK. */
const ALERT_GROUP_CANONICAL_ORDER: ReadonlyMap<string, number> = new Map([
  [ALERT_GROUP_LABELS.firing, 0],
  [ALERT_GROUP_LABELS.noSetup, 1],
  [ALERT_GROUP_LABELS.ok, 2],
]);

const alertGroupValue = (entity: Entity): string => {
  if (!entity.alerts) return ALERT_GROUP_LABELS.noSetup;
  if (entity.alerts.active > 0) return ALERT_GROUP_LABELS.firing;
  return ALERT_GROUP_LABELS.ok;
};

const ALERTS_FIELD: GroupByFieldDef = {
  id: 'alerts',
  label: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.field.alerts', {
    defaultMessage: 'Alerts',
  }),
  valueOf: alertGroupValue,
  canonicalOrder: ALERT_GROUP_CANONICAL_ORDER,
};

const CORE_FIELDS: readonly GroupByFieldDef[] = [
  {
    id: 'category',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.field.category', {
      defaultMessage: 'Category',
    }),
    valueOf: (entity) => getCategoryDescriptor(entity.category)?.label ?? entity.category,
    canonicalOrder: CATEGORY_CANONICAL_ORDER,
  },
  {
    id: 'type',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.field.type', {
      defaultMessage: 'Type',
    }),
    valueOf: (entity) => entity.type || UNKNOWN,
    canonicalOrder: TYPE_CANONICAL_ORDER,
  },
  {
    id: 'health',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.field.health', {
      defaultMessage: 'Health',
    }),
    valueOf: (entity) => HEALTH_LABEL[entity.health] ?? UNKNOWN,
  },
  {
    id: 'provider',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.groupBy.field.provider', {
      defaultMessage: 'Cloud provider',
    }),
    valueOf: (entity) =>
      entity.provider ? PROVIDER_LABEL[entity.provider] ?? entity.provider : UNKNOWN,
  },
];

const tagGroupByFields = (isElasticOn: boolean, isPhase1 = false): GroupByFieldDef[] =>
  getVisibleTagKeys(isElasticOn, isPhase1).map((key) => ({
    id: `tag:${key}`,
    label: TAG_KEY_LABEL[key],
    valueOf: (entity: Entity) => entity.tags[key] || UNKNOWN,
  }));

/**
 * Fields offered in the Group by dropdown. Includes the per-category "extra"
 * attributes (e.g. Hosts → OS / Cloud provider / Service name) when the page is
 * scoped to a category that declares them. ElasticOn omits Application.
 *
 * In Phase 1 the "Health" field is replaced by "Alerts" (no health concept).
 */
export const getGroupByFields = (
  categoryScope?: EntityCategoryId,
  isElasticOn = false,
  phase: string = 'phase3'
): GroupByFieldDef[] => {
  const isPhase1 = phase === 'phase1';
  const fields = isPhase1
    ? CORE_FIELDS.filter((f) => f.id !== 'health')
    : CORE_FIELDS;
  const alertsField = isPhase1 ? [ALERTS_FIELD] : [];
  const attrFields: GroupByFieldDef[] = categoryScope
    ? getCategoryExtraFilters(categoryScope).map((def) => ({
        id: `attr:${def.key}`,
        label: def.label,
        valueOf: (entity: Entity) => entity.attributes?.[def.key] || UNKNOWN,
      }))
    : [];
  return [...fields, ...alertsField, ...tagGroupByFields(isElasticOn, isPhase1), ...attrFields];
};

export const getGroupByFieldDef = (
  id: GroupByFieldId,
  fields: readonly GroupByFieldDef[]
): GroupByFieldDef | undefined => fields.find((field) => field.id === id);

/** Resolve a grouping (list of ids) to defs, dropping ids not in the catalog. */
export const resolveGroupByFields = (
  groupBy: readonly GroupByFieldId[],
  fields: readonly GroupByFieldDef[]
): GroupByFieldDef[] =>
  groupBy
    .map((id) => getGroupByFieldDef(id, fields))
    .filter((def): def is GroupByFieldDef => def != null);

export const isDefaultGroupBy = (groupBy: readonly GroupByFieldId[]): boolean =>
  groupBy.length === DEFAULT_GROUP_BY.length &&
  groupBy.every((id, index) => id === DEFAULT_GROUP_BY[index]);

export interface EntityGroupNode {
  readonly key: string;
  readonly label: string;
  readonly entities: Entity[];
  /** Level-2 buckets; empty for a leaf (single grouping field). */
  readonly children: EntityGroupNode[];
}

const groupOneLevel = (entities: readonly Entity[], def: GroupByFieldDef): EntityGroupNode[] => {
  const buckets = new Map<string, Entity[]>();
  for (const entity of entities) {
    const label = def.valueOf(entity);
    const list = buckets.get(label) ?? [];
    list.push(entity);
    buckets.set(label, list);
  }
  const nodes = Array.from(buckets.entries()).map(([label, rows]) => ({
    key: label,
    label,
    entities: rows,
    children: [] as EntityGroupNode[],
  }));

  const order = def.canonicalOrder;
  if (order) {
    const fallback = order.size;
    nodes.sort((a, b) => {
      const posA = order.get(a.label) ?? fallback;
      const posB = order.get(b.label) ?? fallback;
      if (posA !== posB) return posA - posB;
      // Both items share the same canonical position (or both are unlisted):
      // fall back to count-descending, then alphabetical.
      const sizeDelta = b.entities.length - a.entities.length;
      if (sizeDelta !== 0) return sizeDelta;
      return a.label.localeCompare(b.label);
    });
  } else {
    nodes.sort((a, b) => {
      const sizeDelta = b.entities.length - a.entities.length;
      if (sizeDelta !== 0) return sizeDelta;
      return a.label.localeCompare(b.label);
    });
  }
  return nodes;
};

/**
 * Group entities by 1–2 fields. Level-1 buckets are ordered largest-first
 * (ties alphabetical), matching the built-in grouping; each carries its
 * level-2 children when a second field is supplied.
 */
export const groupEntities = (
  entities: readonly Entity[],
  fields: readonly GroupByFieldDef[]
): EntityGroupNode[] => {
  if (fields.length === 0) return [];
  const level1 = groupOneLevel(entities, fields[0]);
  if (fields.length === 1) return level1;
  return level1.map((node) => ({
    ...node,
    children: groupOneLevel(node.entities, fields[1]),
  }));
};
