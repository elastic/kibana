/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetsPlugin } from './plugin';

export type { CreateDatasetFlyoutProps, CreateDatasetFormValues } from './create_dataset_flyout';
export { CreateDatasetFlyout } from './create_dataset_flyout';
export type { CreateDataSourceFlyoutProps } from './create_data_source_flyout';
export { CreateDataSourceFlyout } from './create_data_source_flyout';
export { DatasetsClient } from './datasets_client';
export { DataSourcesClient } from './data_sources_client';
export type { DatasetsPluginStart } from './types';

export function plugin() {
  return new DatasetsPlugin();
}
