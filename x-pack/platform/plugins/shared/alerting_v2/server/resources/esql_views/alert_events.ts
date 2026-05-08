/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../../lib/services/resource_service/esql_view_initializer';

export const getAlertEventsViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:rule-events',
  name: '$.rule-events',
  query: 'FROM .rule-events',
});
