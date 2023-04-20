/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AN_ERROR_OCCURRED_CHECKING_INDEX = (indexName: string) =>
  i18n.translate(
    'securitySolutionPackages.ecsDataQualityDashboard.checkAllErrorCheckingIndexMessage',
    {
      values: { indexName },
      defaultMessage: 'An error occurred checking index {indexName}',
    }
  );
