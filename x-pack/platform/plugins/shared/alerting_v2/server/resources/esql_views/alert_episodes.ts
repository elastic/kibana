/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodesViewQuery } from '@kbn/alerting-v2-schemas';
import type { EsqlViewDefinition } from '../../lib/services/resource_service/esql_view_initializer';

export const getAlertEpisodesViewDefinition = (): EsqlViewDefinition => ({
  key: 'view:alert-episodes',
  name: '$.alert-episodes',
  query: buildEpisodesViewQuery().print('basic'),
});
