/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-types';
import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
import { fromStoredDataView } from '@kbn/as-code-data-views-transforms';
import type { AdhocDataView, LegacyAdhocDataView } from '../../server';

/**
 * Converts a stored ad hoc data view (`LegacyAdhocDataView` or full `DataViewSpec`)
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
 * Converts an as-code ad hoc data view to the `LegacyAdhocDataView` shape written to saved objects.
 * Properties that the legacy shape can not represent (field settings, field filters) are dropped.
 */
export function transformAdhocDataViewIn(adhocDataView: AdhocDataView): LegacyAdhocDataView {
  return {
    id: adhocDataView.id,
    title: adhocDataView.index_pattern,
    ...(adhocDataView.name !== undefined && { name: adhocDataView.name }),
    ...(adhocDataView.time_field !== undefined && { timeFieldName: adhocDataView.time_field }),
    ...(adhocDataView.allow_hidden_indices !== undefined && {
      allowHidden: adhocDataView.allow_hidden_indices,
    }),
  };
}
