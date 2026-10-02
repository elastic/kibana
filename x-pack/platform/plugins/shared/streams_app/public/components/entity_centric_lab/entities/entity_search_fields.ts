/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityCategoryId } from './fake_entities';
import { getCategoryExtraFilters } from './fake_entities';

/** True when the inventory is scoped to Kubernetes (category page or filter). */
export const isKubernetesInventoryScope = (
  categoryScope?: EntityCategoryId
): boolean => categoryScope === 'kubernetes';

/** True when the inventory is scoped to Cloud (category page or filter). */
export const isCloudInventoryScope = (categoryScope?: EntityCategoryId): boolean =>
  categoryScope === 'cloud';

/**
 * Fields offered on every inventory page. Environment / Region are intentionally
 * omitted — those dropdowns were removed; users can still match them via free
 * text, but autocomplete should lead with useful, page-relevant fields.
 * `health` is appended only outside Phase 1 (Phase 1 has no health concept).
 */
const BASE_SEARCH_FIELDS = ['name', 'type', 'team'] as const;

/** Cross-category "All resources" also offers category as a field. */
const CROSS_CATEGORY_SEARCH_FIELDS = ['category'] as const;

/** Set on cloud entities only — offered when the view is Cloud-scoped. */
const CLOUD_SEARCH_FIELDS = ['cloud.provider', 'provider'] as const;

/**
 * K8s hierarchy + resource kind — only meaningful when the view is K8s-scoped.
 * `subtype` covers Clusters / Nodes / Namespaces / Pods / … labels.
 */
const KUBERNETES_SEARCH_FIELDS = [
  'cluster',
  'namespace',
  'node',
  'deployment',
  'subtype',
] as const;

/** Human labels shown in the unified search autocomplete. */
export const ENTITY_SEARCH_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Name',
  type: 'Type',
  subtype: 'Resource type',
  category: 'Category',
  health: 'Health',
  team: 'Team',
  provider: 'Cloud provider',
  'cloud.provider': 'Cloud provider',
  cluster: 'Cluster',
  namespace: 'Namespace',
  node: 'Node',
  deployment: 'Deployment',
  os: 'Operating system',
  cloudProvider: 'Cloud provider',
  serviceName: 'Service name',
};

/**
 * Field names exposed in the unified search bar (autocomplete and "+ Add
 * filter") for the current page scope. Category-specific fields (K8s
 * hierarchy, cloud provider, Hosts extras) are omitted on All resources and
 * on unrelated category pages. Phase 1 drops `health` (no health concept).
 */
export const getEntitySearchFieldNames = (
  categoryScope?: EntityCategoryId,
  isPhase1 = false
): readonly string[] => {
  const fields: string[] = [...BASE_SEARCH_FIELDS];
  if (!isPhase1) {
    fields.push('health');
  }
  if (!categoryScope) {
    fields.push(...CROSS_CATEGORY_SEARCH_FIELDS);
  }
  if (isCloudInventoryScope(categoryScope)) {
    fields.push(...CLOUD_SEARCH_FIELDS);
  }
  if (isKubernetesInventoryScope(categoryScope)) {
    fields.push(...KUBERNETES_SEARCH_FIELDS);
  }
  // Category-declared extras (e.g. Hosts → OS / Cloud provider / Service name).
  if (categoryScope) {
    for (const def of getCategoryExtraFilters(categoryScope)) {
      if (!fields.includes(def.key)) {
        fields.push(def.key);
      }
    }
  }
  return fields;
};
