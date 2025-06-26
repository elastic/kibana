/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';

export interface LogsDataAccessPluginSetupDeps {
  data: DataPluginSetup;
}

export interface LogsDataAccessPluginStartDeps {
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
}
