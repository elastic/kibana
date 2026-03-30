/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlViewDefinition } from '../lib/services/esql_views_service/types';
import { RULE_EVENTS_ESQL } from '../../common/esql_queries';

export const getAlertEventsViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:rule-events',
  name: '$.rule-events',
  query: RULE_EVENTS_ESQL,
});
