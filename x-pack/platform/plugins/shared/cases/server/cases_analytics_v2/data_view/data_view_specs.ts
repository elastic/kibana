/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { CASE_INDEX_NAME } from '../constants';

/**
 * Shared prefix for every managed Cases data view id. One data view exists
 * per space; the id is suffixed with the space id so they're independently
 * addressable. The prefix is exported so the operator `/reset` route can
 * enumerate every per-space view via a prefix match.
 */
export const CASE_DATA_VIEW_ID_PREFIX = 'cases-analytics-managed-';

/**
 * Deterministic data view id for the given space. Same id across every
 * Kibana node + every restart for the same space, so concurrent bootstrap
 * calls converge on the same saved object and we never accidentally create
 * duplicates.
 */
export const getCaseDataViewId = (spaceId: string): string =>
  `${CASE_DATA_VIEW_ID_PREFIX}${spaceId}`;

/**
 * Display name shown in the Lens / Discover data view dropdown. Plain
 * `Cases` (no v2 suffix) — v1 doesn't create a managed data view, so
 * there's nothing to disambiguate against.
 */
const CASE_DATA_VIEW_NAME = 'Cases';

/**
 * Base spec for the managed Cases data view in a single space. Runtime
 * fields are added on top via the data-view service from that same space's
 * declared templates.
 *
 * **Per-space scoping.** Data views are space-scoped saved objects. We
 * deliberately create one per space rather than a single global view with
 * `namespaces: ['*']` because:
 *   1. The runtime field map is derived from template SOs — also
 *      space-scoped. A space-A analyst shouldn't see fields declared by
 *      templates in space B.
 *   2. The global map would balloon with N × M fields on tenants with
 *      thousands of spaces.
 *   3. Cross-space naming collisions (two spaces declaring the same
 *      `riskScore_as_long` for different purposes) are impossible per-space.
 *
 * Indices remain cluster-level — `.cases` is a single shared index. Only
 * the *view* into it is per-space. DLS (when the implicit-privileges
 * provider lands) layers on top, scoping which documents in `.cases` each
 * user can read.
 *
 * Other settings:
 *   - `managed: true`         — UI flags this as Kibana-owned; operator
 *                               edits get a "managed by application" hint.
 *   - `allowNoIndex: true`    — view is creatable before any docs land in
 *                               `.cases`. Avoids start-order coupling.
 *   - `timeFieldName`         — `@timestamp` (set to last activity at
 *                               write time) makes Discover's time picker
 *                               meaningful.
 */
export const buildCaseDataViewSpec = (spaceId: string): DataViewSpec => ({
  id: getCaseDataViewId(spaceId),
  name: CASE_DATA_VIEW_NAME,
  title: CASE_INDEX_NAME,
  timeFieldName: '@timestamp',
  allowNoIndex: true,
  managed: true,
  namespaces: [spaceId],
  runtimeFieldMap: {},
});
