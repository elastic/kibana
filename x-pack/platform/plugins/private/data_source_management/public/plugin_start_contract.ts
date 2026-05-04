/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { CreateDatasetFlyoutProps } from './create_dataset_flyout';
import type { CreateDataSourceFlyoutProps } from './create_data_source_flyout';

export interface DataSourceManagementPluginStart {
  /**
   * Same flyout UI as Stack Management, for embedding in other plugin surfaces.
   */
  CreateDataSourceFlyout: ComponentType<CreateDataSourceFlyoutProps>;
  /** Create data set flyout (name, description, data source, resource). */
  CreateDatasetFlyout: ComponentType<CreateDatasetFlyoutProps>;
}
