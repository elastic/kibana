/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const TOOLTIP_DATE_FORMAT = 'YYYY-MM-DD HH:mm';
export const ALERT_COUNT_FORMAT = '0.[00]a';

export const ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ = 'activeAlertCount';
export const TOTAL_ALERT_COUNT_DATA_TEST_SUBJ = 'totalAlertCount';

export const WIDGET_TITLE = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.alertsSummaryWidget.title"
    defaultMessage="Alert activity"
  />
);

export const ALERTS_LABEL = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.alertsSummaryWidget.alerts"
    defaultMessage="Alerts"
  />
);

export const ACTIVE_NOW_LABEL = (
  <FormattedMessage
    id="xpack.triggersActionsUI.sections.alertsSummaryWidget.activeNow"
    defaultMessage="Active now"
  />
);
