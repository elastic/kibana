/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../lib/services/esql_views_service/types';

export const getAlertEpisodesViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alerting-episodes',
  name: '$.alerting-episodes',
  query:
    'FROM .alerting-events | INLINE STATS last_timestamp = MAX(@timestamp) BY episode.id | WHERE @timestamp == last_timestamp AND type == "alert"',
});
