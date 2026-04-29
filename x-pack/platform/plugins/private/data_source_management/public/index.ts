/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceManagementPlugin } from './plugin';

export type { CreateDataSourceFlyoutProps } from './create_data_source_flyout';
export { CreateDataSourceFlyout } from './create_data_source_flyout';
export { HttpDataSourcesClient } from './http_data_sources_client';
export type { DataSourceManagementPluginStart } from './plugin_start_contract';

export function plugin() {
  return new DataSourceManagementPlugin();
}
