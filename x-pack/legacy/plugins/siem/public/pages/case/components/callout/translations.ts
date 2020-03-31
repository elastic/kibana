/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const READ_ONLY_SAVED_OBJECT_TITLE = i18n.translate(
  'xpack.siem.case.readOnlySavedObjectTitle',
  {
    defaultMessage: 'You have read-only feature privileges',
  }
);

export const READ_ONLY_SAVED_OBJECT_MSG = i18n.translate(
  'xpack.siem.case.readOnlySavedObjectDescription',
  {
    defaultMessage:
      'You are only allowed to view cases. If you need to open and update cases, contact your Kibana administrator',
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.siem.case.dismissErrorsPushServiceCallOutTitle',
  {
    defaultMessage: 'Dismiss',
  }
);
