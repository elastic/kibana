/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityCategoryId } from './fake_entities';

/** True when the inventory is scoped to Kubernetes (category page or filter). */
export const isKubernetesInventoryScope = (
  categoryScope?: EntityCategoryId
): boolean => categoryScope === 'kubernetes';

/** True when the inventory is scoped to Cloud (category page or filter). */
export const isCloudInventoryScope = (categoryScope?: EntityCategoryId): boolean =>
  categoryScope === 'cloud';

/** Fields offered on every inventory page (cross-category and scoped). */
const BASE_SEARCH_FIELDS = [
  'name',
  'type',
  'category',
  'health',
  'environment',
  'team',
  'region',
] as const;

/** Set on cloud entities only — offered when the view is Cloud-scoped. */
const CLOUD_SEARCH_FIELDS = ['cloud.provider'] as const;

/** K8s hierarchy attributes — only meaningful when the view is K8s-scoped. */
const KUBERNETES_SEARCH_FIELDS = ['cluster', 'namespace', 'deployment', 'node'] as const;

/**
 * Field names exposed in the unified search bar (autocomplete and "+ Add
 * filter") for the current page scope. Category-specific fields (K8s
 * hierarchy, cloud provider) are omitted on All resources and on unrelated
 * category pages.
 */
export const getEntitySearchFieldNames = (
  categoryScope?: EntityCategoryId
): readonly string[] => {
  const fields: string[] = [...BASE_SEARCH_FIELDS];
  if (isCloudInventoryScope(categoryScope)) {
    fields.push(...CLOUD_SEARCH_FIELDS);
  }
  if (isKubernetesInventoryScope(categoryScope)) {
    fields.push(...KUBERNETES_SEARCH_FIELDS);
  }
  return fields;
};
