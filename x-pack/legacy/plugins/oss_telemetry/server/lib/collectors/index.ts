/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HapiServer } from '../../../';
import { registerVisualizationsCollector } from './visualizations/register_usage_collector';

export function registerCollectors(server: HapiServer) {
  registerVisualizationsCollector(server);
}
