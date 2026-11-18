/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-types';
import type { AsCodeDataViewSpec } from '@kbn/as-code-data-views-schema';
import { fromStoredDataView as toAsCodeEmbeddedDataView } from '@kbn/as-code-data-views-transforms';
import type { AdhocDataView } from '../../server';

/**
 * Converts a stored ad hoc data view to the as-code ad hoc data view.
 */
export function transformAdhocDataViewOut(stored: DataViewSpec): AdhocDataView {
  if (!stored.id) throw new Error('Cannot convert ad hoc data view without `id`');
  return {
    ...(toAsCodeEmbeddedDataView(stored) as AsCodeDataViewSpec),
    id: stored.id,
  };
}
