/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_PUSH_SERVICE_CALLOUT_TITLE = i18n.translate(
  'xpack.siem.case.errorsPushServiceCallOutTitle',
  {
    defaultMessage: 'You can not push to ServiceNow because of the errors below',
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.siem.case.dismissErrorsPushServiceCallOutTitle',
  {
    defaultMessage: 'Dismiss',
  }
);
