/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Painless script applied by the snapshot reindex. Stamps each history document with the
 * snapshot time, so history readers can find a snapshot by `@timestamp`. The latest index
 * is not modified.
 */
export const HISTORY_SNAPSHOT_STAMP_SCRIPT = `ctx._source['@timestamp'] = params.snapshotTimestamp;`;
