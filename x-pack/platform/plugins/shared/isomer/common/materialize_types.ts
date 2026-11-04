/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';

/** A saved object to load by `id` and materialize from its as-code config. */
export interface MaterializeByReference {
  type: string;
  id: string;
}

/** An as-code config to materialize as is: a dashboard panel, or a config an agent wrote. */
export interface MaterializeByValue {
  type: string;
  config: unknown;
}

/** What to materialize, keyed by saved object type. */
export type MaterializeInput = MaterializeByReference | MaterializeByValue;

/**
 * The context a saved object is materialized in. Hosts keep `filters` as their state, including
 * the ones `filtersForSelection` returns, and pass them back to materialize again.
 */
export interface MaterializeContext {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
  /** ES|QL control values, bound as named params where a query uses them. */
  esqlVariables?: ESQLControlVariable[];
  /** Defaults to the `dateFormat:tz` advanced setting. */
  timeZone?: string;
  locale?: string;
}

export const isMaterializeByReference = (
  input: MaterializeInput
): input is MaterializeByReference => 'id' in input && typeof input.id === 'string';
