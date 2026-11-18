/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-types';
import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
import { fromStoredDataView, toStoredDataView } from '@kbn/as-code-data-views-transforms';
import type { AdhocDataView } from '../../server';

/**
 * Converts a stored ad hoc data view (legacy `LegacyAdhocDataView` or full `DataViewSpec`)
 * to the as-code ad hoc data view. The `id` is retained because layers reference it.
 */
export function transformAdhocDataViewOut(stored: DataViewSpec): AdhocDataView {
  if (!stored.id) throw new Error('Cannot convert ad hoc data view without `id`');
  return {
    ...(fromStoredDataView(stored) as AsCodeDataViewSpec),
    id: stored.id,
  };
}

/**
 * Converts an as-code ad hoc data view back to the stored `DataViewSpec`.
 */
export function transformAdhocDataViewIn(adhocDataView: AdhocDataView): DataViewSpec {
  const { id, ...spec } = adhocDataView;
  return {
    ...(toStoredDataView(spec) as DataViewSpec),
    id,
  };
}
