/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INCOMPATIBLE_FIELD_MAPPINGS_TABLE_TITLE = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.incompatibleTab.incompatibleFieldMappingsTableTitle',
    {
      values: { indexName },
      defaultMessage: 'Incompatible field mappings - {indexName}',
    }
  );

export const INCOMPATIBLE_FIELD_VALUES_TABLE_TITLE = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.incompatibleTab.incompatibleFieldValuesTableTitle',
    {
      values: { indexName },
      defaultMessage: 'Incompatible field values - {indexName}',
    }
  );
