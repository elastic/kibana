/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASE_ACTION_DESC = i18n.translate(
  'xpack.cases.systemActions.casesConnector.selectMessageText',
  {
    defaultMessage: 'Create a case in Kibana.',
  }
);

export const GROUP_BY_ALERT = i18n.translate(
  'xpack.cases.systemActions.casesConnector.groupByLabel',
  {
    defaultMessage: 'Group by alert field',
  }
);

export const TIME_WINDOW = i18n.translate(
  'xpack.cases.systemActions.casesConnector.timeWindowLabel',
  {
    defaultMessage: 'Time window',
  }
);

export const TIME_WINDOW_SIZE_ERROR = i18n.translate(
  'xpack.cases.systemActions.casesConnector.timeWindowSizeError',
  {
    defaultMessage: 'Invalid time window.',
  }
);

export const REOPEN_WHEN_CASE_IS_CLOSED = i18n.translate(
  'xpack.cases.systemActions.casesConnector.reopenWhenCaseIsClosed',
  {
    defaultMessage: 'Reopen when the case is closed',
  }
);

export const DAYS = (timeValue: string) =>
  i18n.translate('xpack.cases.systemActions.casesConnector.daysLabel', {
    defaultMessage: '{timeValue, plural, one {day} other {days}}',
    values: { timeValue },
  });

export const WEEKS = (timeValue: string) =>
  i18n.translate('xpack.cases.systemActions.casesConnector.weeksLabel', {
    defaultMessage: '{timeValue, plural, one {week} other {weeks}}',
    values: { timeValue },
  });

export const DEFAULT_EMPTY_TEMPLATE_NAME = i18n.translate(
  'xpack.cases.systemActions.casesConnector.defaultEmptyTemplateName',
  {
    defaultMessage: 'No template selected',
  }
);
export const GROUP_BY_ALERT_OPTIONAL_LABEL = i18n.translate(
  'xpack.cases.systemActions.casesConnector.groupByAlertOptionalField',
  {
    defaultMessage: 'Optional',
  }
);
