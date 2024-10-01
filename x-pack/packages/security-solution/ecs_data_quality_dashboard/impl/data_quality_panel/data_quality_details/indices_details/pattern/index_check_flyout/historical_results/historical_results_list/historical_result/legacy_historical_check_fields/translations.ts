/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DEPRECATED_DATA_FORMAT = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.deprecatedDataFormat',
  {
    defaultMessage: 'Deprecated data format',
  }
);

export const CHECK_IS_BASED_ON_LEGACY_FORMAT = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.checkIsBasedOnLegacyFormat',
  {
    defaultMessage:
      'This check result is based on a legacy version of the data. It only includes expanded view of incompatible fields.',
  }
);

export const TO_SEE_RUN_A_NEW_CHECK = i18n.translate(
  'securitySolutionPackages.ecsDataQualityDashboard.toSeeRunANewCheck',
  {
    defaultMessage:
      'To see check results with latest data format (including expanded view of same family fields), you need to run a new check.',
  }
);
