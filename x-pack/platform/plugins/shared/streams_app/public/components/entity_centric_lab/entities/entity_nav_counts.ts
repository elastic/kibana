/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Publishes inventoriable entity counts for the Observability left nav.
 *
 * Mirrors the saved-views / favorites pattern: a BehaviorSubject on
 * `globalThis` under a shared key so Observability's navigation_tree can
 * subscribe without importing this Streams bundle (which would pull the
 * whole lab graph into the solution nav).
 */

import { BehaviorSubject } from 'rxjs';
import { readAwsReinventEnabled } from './aws_nav_variant';
import type { DataVariation } from './variation_registry';
import {
  buildFakeEntities,
  ELASTICON_HIDDEN_CATEGORY_IDS,
  type EntityCategoryId,
  type FakeEntitiesDataset,
} from './fake_entities';

/** Must match the key in observability `entity_centric_lab_integrations.ts`. */
export const ENTITY_NAV_COUNTS_GLOBAL_KEY = '__kbnEntityCentricLabNavCounts$__';

export interface EntityNavCounts {
  /** Sum of inventoriable resources (ElasticOn excludes APM Services). */
  readonly all: number;
  readonly byCategory: Readonly<Partial<Record<EntityCategoryId, number>>>;
  /**
   * Resources with at least one active alert, for left-nav notification
   * badges. `all` excludes ElasticOn-hidden categories when published with
   * that option.
   */
  readonly alertingAll: number;
  readonly alertingByCategory: Readonly<Partial<Record<EntityCategoryId, number>>>;
  /**
   * Resources that have an active alert inside a maintenance window.
   * Still counted in {@link alertingAll}.
   */
  readonly maintenanceAll: number;
  readonly maintenanceByCategory: Readonly<Partial<Record<EntityCategoryId, number>>>;
}

const EMPTY_COUNTS: EntityNavCounts = {
  all: 0,
  byCategory: {},
  alertingAll: 0,
  alertingByCategory: {},
  maintenanceAll: 0,
  maintenanceByCategory: {},
};

interface SharedState {
  readonly subject: BehaviorSubject<EntityNavCounts>;
}

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[ENTITY_NAV_COUNTS_GLOBAL_KEY];
  if (!state) {
    state = { subject: new BehaviorSubject<EntityNavCounts>(EMPTY_COUNTS) };
    root[ENTITY_NAV_COUNTS_GLOBAL_KEY] = state;
  }
  return state;
};

export const countsFromDataset = (
  dataset: FakeEntitiesDataset,
  options?: { readonly excludeHiddenFromAll?: boolean }
): EntityNavCounts => {
  // Always publish every category (APM Services still needs a nav count in
  // Latest). ElasticOn "All resources" omits hidden categories from `all`.
  const excludeHiddenFromAll = options?.excludeHiddenFromAll ?? true;
  const byCategory: Partial<Record<EntityCategoryId, number>> = {};
  let all = 0;
  for (const entry of dataset.categoryCounts) {
    byCategory[entry.category] = entry.total;
    if (excludeHiddenFromAll && ELASTICON_HIDDEN_CATEGORY_IDS.has(entry.category)) {
      continue;
    }
    all += entry.total;
  }

  const alertingByCategory: Partial<Record<EntityCategoryId, number>> = {};
  const maintenanceByCategory: Partial<Record<EntityCategoryId, number>> = {};
  let alertingAll = 0;
  let maintenanceAll = 0;
  for (const entity of dataset.entities) {
    if ((entity.alerts?.active ?? 0) <= 0) continue;
    alertingByCategory[entity.category] = (alertingByCategory[entity.category] ?? 0) + 1;
    const inMaintenance = (entity.alerts?.inMaintenance ?? 0) > 0;
    if (inMaintenance) {
      maintenanceByCategory[entity.category] = (maintenanceByCategory[entity.category] ?? 0) + 1;
    }
    if (excludeHiddenFromAll && ELASTICON_HIDDEN_CATEGORY_IDS.has(entity.category)) {
      continue;
    }
    alertingAll += 1;
    if (inMaintenance) maintenanceAll += 1;
  }

  return {
    all,
    byCategory,
    alertingAll,
    alertingByCategory,
    maintenanceAll,
    maintenanceByCategory,
  };
};

export const publishEntityNavCounts = (counts: EntityNavCounts): void => {
  getSharedState().subject.next(counts);
};

const readNavBadgesEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('elasticOn_v_navBadges') === 'on';
  } catch {
    return false;
  }
};

export const publishEntityNavCountsFromDataset = (
  dataset: FakeEntitiesDataset,
  options?: { readonly excludeHiddenFromAll?: boolean }
): void => {
  // Off by default. The variant selector persists `on` under elasticOn_v_navBadges.
  if (!readNavBadgesEnabled()) {
    publishEntityNavCounts(EMPTY_COUNTS);
    return;
  }
  publishEntityNavCounts(countsFromDataset(dataset, options));
};

const readDataProfile = (): DataVariation => {
  if (typeof window === 'undefined') return 'default';
  try {
    const raw = window.localStorage.getItem('elasticOn_v_data');
    if (raw === 'full' || raw === 'overflow' || raw === 'empty' || raw === 'default') {
      return raw;
    }
  } catch {
    // Storage blocked — fall through to default.
  }
  return 'default';
};

/**
 * AWS Re-invent moves EC2, Lambda, and S3 out of Hosts, Functions, and
 * Storage. Nav totals follow that, so Hosts no longer counts EC2.
 */
const relocateAwsForNavCounts = (dataset: FakeEntitiesDataset): FakeEntitiesDataset => {
  const entities = dataset.entities.map((entity) =>
    entity.provider === 'aws' ? { ...entity, category: 'aws' as const } : entity
  );
  const totals = new Map<EntityCategoryId, number>();
  for (const entity of entities) {
    totals.set(entity.category, (totals.get(entity.category) ?? 0) + 1);
  }
  return {
    ...dataset,
    entities,
    categoryCounts: dataset.categoryCounts.map((entry) =>
      entry.category === 'kubernetes' ? entry : { ...entry, total: totals.get(entry.category) ?? 0 }
    ),
  };
};

/** Rebuild + publish counts for the current data profile (nav cold start). */
export const refreshEntityNavCounts = (): void => {
  const dataset = buildFakeEntities(readDataProfile());
  publishEntityNavCountsFromDataset(
    readAwsReinventEnabled() ? relocateAwsForNavCounts(dataset) : dataset,
    { excludeHiddenFromAll: true }
  );
};
