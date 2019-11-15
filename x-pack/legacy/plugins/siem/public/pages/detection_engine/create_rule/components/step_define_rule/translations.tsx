/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const CUSTOM_QUERY_REQUIRED = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.customQueryFieldRequiredError',
  {
    defaultMessage: 'A custom query is required.',
  }
);

export const INVALID_CUSTOM_QUERY = i18n.translate(
  'xpack.siem.detectionEngine.createRule.stepDefineRule.customQueryFieldInvalidError',
  {
    defaultMessage: 'The KQL is invalid',
  }
);
