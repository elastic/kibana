/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { IsomerPluginStart } from '@kbn/isomer-plugin/server';

export interface IsomerDashboardsStartDeps {
  isomer: IsomerPluginStart;
  dataViews: DataViewsServerPluginStart;
}
