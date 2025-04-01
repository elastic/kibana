/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../translations';

export const ADD_CONNECTOR = i18n.translate('xpack.cases.addConnector.title', {
  defaultMessage: 'Add connector',
});

export const PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE = i18n.translate(
  'xpack.cases.caseView.pushToServiceDisableBecauseCaseClosedTitle',
  {
    defaultMessage: 'Reopen the case',
  }
);
export const ERROR_PUSH_SERVICE_CALLOUT_TITLE = i18n.translate(
  'xpack.cases.caseView.errorsPushServiceCallOutTitle',
  {
    defaultMessage: 'Select an external connector',
  }
);
