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
}

const EMPTY_COUNTS: EntityNavCounts = {
  all: 0,
  byCategory: {},
  alertingAll: 0,
  alertingByCategory: {},
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
  let alertingAll = 0;
  for (const entity of dataset.entities) {
    if ((entity.alerts?.active ?? 0) <= 0) continue;
    alertingByCategory[entity.category] = (alertingByCategory[entity.category] ?? 0) + 1;
    if (excludeHiddenFromAll && ELASTICON_HIDDEN_CATEGORY_IDS.has(entity.category)) {
      continue;
    }
    alertingAll += 1;
  }

  return { all, byCategory, alertingAll, alertingByCategory };
};

export const publishEntityNavCounts = (counts: EntityNavCounts): void => {
  getSharedState().subject.next(counts);
};

export const publishEntityNavCountsFromDataset = (
  dataset: FakeEntitiesDataset,
  options?: { readonly excludeHiddenFromAll?: boolean }
): void => {
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

/** Rebuild + publish counts for the current data profile (nav cold start). */
export const refreshEntityNavCounts = (): void => {
  const dataset = buildFakeEntities(readDataProfile());
  publishEntityNavCountsFromDataset(dataset, { excludeHiddenFromAll: true });
};
