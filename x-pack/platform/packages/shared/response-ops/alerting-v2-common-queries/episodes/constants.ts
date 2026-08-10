/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** ES|QL named parameter used by {@link buildEpisodesQuery} for the LIMIT clause. */
export const PAGE_SIZE_ESQL_VARIABLE = 'pageSize';

/** Default look-back window (number of recent statuses) for flapping queries. */
export const DEFAULT_FLAPPING_LOOKBACK = 20;
