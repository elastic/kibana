/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import {
  CASES_DATA_CASE_ALIAS,
  CASES_DATA_CASE_ACTIVITY_ALIAS,
  CASES_DATA_CASE_LIFECYCLE_ALIAS,
} from '../../../common/constants';
import type { CasesDataSurface } from '../constants';

/**
 * Deterministic data view IDs. Same ID across every Kibana node, every space,
 * every restart — so concurrent bootstrap calls converge on the same SO and
 * we never accidentally create duplicates.
 */
export const CASES_DATA_VIEW_IDS: Record<CasesDataSurface, string> = {
  case: 'cases-data-case',
  case_activity: 'cases-data-case-activity',
  case_lifecycle: 'cases-data-case-lifecycle',
};

const TITLES: Record<CasesDataSurface, string> = {
  case: 'Cases',
  case_activity: 'Cases — Activity',
  case_lifecycle: 'Cases — Lifecycle',
};

const INDEX_PATTERNS: Record<CasesDataSurface, string> = {
  case: CASES_DATA_CASE_ALIAS,
  case_activity: CASES_DATA_CASE_ACTIVITY_ALIAS,
  case_lifecycle: CASES_DATA_CASE_LIFECYCLE_ALIAS,
};

/**
 * Default data view spec for a surface. Created managed (so the UI flags it
 * as Kibana-owned and operator edits get a "managed by application" hint),
 * `allowNoIndex: true` so the view is creatable before the underlying alias
 * is bootstrapped, and `timeFieldName: '@timestamp'` to play well with
 * Discover's time picker.
 *
 * `namespaces: ['*']` makes the data view visible in every space rather than
 * only the space whose context bootstrapped it. The underlying indices are
 * cluster-level, the data view SO is per-space — without this flag, users in
 * other spaces would see "no data view" until someone re-bootstrapped under
 * their context. The bootstrap path uses `overwrite: true` keyed on the
 * deterministic id, so concurrent bootstraps from different spaces converge.
 *
 * Runtime fields are added incrementally by the data view sync service as
 * templates declare new extended fields. The base spec carries an empty
 * `runtimeFieldMap` so subsequent merges have something to extend.
 */
export const buildBaseDataViewSpec = (surface: CasesDataSurface): DataViewSpec => ({
  id: CASES_DATA_VIEW_IDS[surface],
  name: TITLES[surface],
  title: INDEX_PATTERNS[surface],
  timeFieldName: '@timestamp',
  allowNoIndex: true,
  managed: true,
  namespaces: ['*'],
  runtimeFieldMap: {},
});
