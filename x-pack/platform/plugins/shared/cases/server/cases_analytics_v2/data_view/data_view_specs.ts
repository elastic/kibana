/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { CASE_INDEX_NAME } from '../constants';

/**
 * Deterministic data view id. Same across every Kibana node, every space,
 * every restart — so concurrent bootstrap calls converge on the same SO and
 * we never accidentally create duplicates.
 */
export const CASE_DATA_VIEW_ID = 'cases-analyticsV2-case';

/**
 * Display name shown in the Lens / Discover data view dropdown. No `(v2)`
 * suffix because v1 creates no data view — there's nothing to disambiguate
 * against.
 */
const CASE_DATA_VIEW_NAME = 'Cases';

/**
 * Base spec for the managed Cases data view. Runtime fields are added on top
 * via the data-view service as templates declare new extended fields.
 *
 * - `managed: true`         — UI flags this as Kibana-owned; operator edits
 *                             get a "managed by application" hint.
 * - `allowNoIndex: true`    — view is creatable before the `.cases` index is
 *                             bootstrapped (avoids start-order coupling).
 * - `namespaces: ['*']`     — visible in every space, not just the one whose
 *                             context bootstrapped it. The cases-data
 *                             indices are cluster-level; the data view SO is
 *                             per-space — without this flag, users in other
 *                             spaces would see "no data view" until someone
 *                             re-bootstrapped under their context.
 * - `timeFieldName`         — `@timestamp` (set to last activity at write
 *                             time) makes Discover's time picker meaningful.
 */
export const buildBaseCaseDataViewSpec = (): DataViewSpec => ({
  id: CASE_DATA_VIEW_ID,
  name: CASE_DATA_VIEW_NAME,
  title: CASE_INDEX_NAME,
  timeFieldName: '@timestamp',
  allowNoIndex: true,
  managed: true,
  namespaces: ['*'],
  runtimeFieldMap: {},
});
