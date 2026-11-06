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
  /** Saved object type with a registered materializer. */
  type: string;
  /** ID within that saved object type. */
  id: string;
}

/** An as-code config to materialize as is: a dashboard panel, or a config an agent wrote. */
export interface MaterializeByValue {
  /** Saved object type with a registered materializer. */
  type: string;
  /** Type-specific config; the materializer validates its shape. */
  config: unknown;
}

/** What to materialize, keyed by saved object type. */
export type MaterializeInput = MaterializeByReference | MaterializeByValue;

/**
 * The context a saved object is materialized in. Hosts keep `filters` as their state, including
 * the ones `filtersForSelection` returns, and pass them back to materialize again.
 */
export interface MaterializeContext {
  /** Time range for data requested by the materializer. */
  timeRange?: TimeRange;
  /** Kibana query applied to data requested by the materializer. */
  query?: Query;
  /** Kibana filters applied to data requested by the materializer. */
  filters?: Filter[];
  /** ES|QL control values, bound as named params where a query uses them. */
  esqlVariables?: ESQLControlVariable[];
  /** Optional time zone for date formatting; this API does not supply a default yet. */
  timeZone?: string;
  /** Optional locale for formatting. */
  locale?: string;
}
