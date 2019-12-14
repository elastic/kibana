/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Refresh only query is query where timestamps are different but query is the same.
// Triggered by clicking "Refresh" button in QueryBar
export function isRefreshOnlyQuery(prevQuery, newQuery) {
  return (
    prevQuery.queryLastTriggeredAt !== newQuery.queryLastTriggeredAt &&
    prevQuery.language === newQuery.language &&
    prevQuery.query === newQuery.query
  );
}
