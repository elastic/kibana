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
 * addressable. The prefix is exported so the administrator `/reset` route
 * can enumerate every per-space view via a prefix match.
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
 * fields are added on top via the data-view service from that same
 * space's templates.
 *
 * **Per-space scoping.** Templates are space-scoped SOs, so the derived
 * runtime field map is too — a global view with `namespaces: ['*']` would
 * leak space-A field definitions into space B and balloon to N × M fields
 * on tenants with thousands of spaces. The underlying `.cases` index
 * stays cluster-level; only the *view* is per-space.
 *
 * Settings:
 *   - `managed: true`        — UI flags this as Kibana-owned; administrator
 *                              edits get a "managed by application" hint.
 *   - `allowNoIndex: true`   — view is creatable before docs land in `.cases`.
 *   - `timeFieldName`        — `@timestamp` (last activity at write time).
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
