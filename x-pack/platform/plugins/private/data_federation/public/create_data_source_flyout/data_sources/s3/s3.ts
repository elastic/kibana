/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateDataSourceFlyoutTypeSettingsS3Region } from './create_data_source_flyout_type_settings_s3';
import type { DataSourceType } from '../../../../common';

export const s3DataSourceDefinition = {
  id: 's3' as DataSourceType,
  label: 'Amazon S3',
  description:
    'Amazon S3 is a object storage service that offers industry-leading scalability, data availability, security, and performance.',
  icon: 'logoAWS',
  dataSourceConfigComponent: CreateDataSourceFlyoutTypeSettingsS3Region,
};
