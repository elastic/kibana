/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../lib/services/esql_views_service/types';

export const getAlertEventsViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alert-events',
  name: 'alerts-events',
  query: 'FROM .alerts-events',
});
