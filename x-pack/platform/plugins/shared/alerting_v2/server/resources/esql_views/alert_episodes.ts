/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../../lib/services/resource_service/esql_view_initializer';

export const getAlertEpisodesViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alert-episodes',
  name: '$.alert-episodes',
  query: `FROM .rule-events
| INLINE STATS first_timestamp = MIN(@timestamp), last_timestamp = MAX(@timestamp) BY episode.id
| EVAL duration = DATE_DIFF("ms", first_timestamp, last_timestamp)
| WHERE @timestamp == last_timestamp AND type == "alert"
| SORT @timestamp DESC`,
});
