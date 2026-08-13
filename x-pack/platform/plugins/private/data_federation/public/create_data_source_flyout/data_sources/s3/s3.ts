/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { S3DataSourceRequiredSettings } from './s3_data_source_required_settings';
import type { DataSourceType } from '../../../../common';
import { S3DataSourceAdvancedSettings } from './s3_data_source_advanced_settings';

export const s3DataSourceDefinition = {
  id: 's3' as DataSourceType,
  label: 'Amazon S3',
  description:
    'Amazon S3 is a object storage service that offers industry-leading scalability, data availability, security, and performance.',
  icon: 'logoAWS',
  dataSourceRequiredSettingsComponent: S3DataSourceRequiredSettings,
  dataSourceAdvancedSettingsComponent: S3DataSourceAdvancedSettings,
};
