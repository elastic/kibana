/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Rows one data request may contribute to a node. Matches the result size ES|QL returns for a
 * query without a `LIMIT`, so a query that relies on that default loses nothing to the cap.
 */
export const MAX_ROWS_PER_REQUEST = 1_000;

/** How long one data request may run before it is aborted. */
export const DATA_REQUEST_TIMEOUT_MS = 30_000;

/** How deeply `materialize` requests may nest: a dashboard's panels are one level. */
export const MAX_MATERIALIZE_DEPTH = 4;
