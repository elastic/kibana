/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
import { fromDataViewSpec } from '@kbn/as-code-data-views-transforms';
import type { AdhocDataView, LegacyAdhocDataView } from '../../server';

/**
 * Converts a `LegacyAdhocDataView` to the as-code ad hoc data view. The `id` is retained because layers reference it.
 */
export function transformAdhocDataViewOut(stored: LegacyAdhocDataView): AdhocDataView {
  if (!stored.id) throw new Error('Cannot convert ad hoc data view without `id`');
  return {
    ...(fromDataViewSpec(stored) as AsCodeDataViewSpec),
    id: stored.id,
  };
}
