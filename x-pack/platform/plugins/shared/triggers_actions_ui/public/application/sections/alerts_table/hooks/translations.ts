/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ERROR_FETCH_ALERTS = i18n.translate(
  'xpack.triggersActionsUI.components.alertTable.useFetchAlerts.errorMessageText',
  {
    defaultMessage: `An error has occurred on alerts search`,
  }
);

export const ERROR_FETCH_BROWSER_FIELDS = i18n.translate(
  'xpack.triggersActionsUI.components.alertTable.useFetchBrowserFieldsCapabilities.errorMessageText',
  {
    defaultMessage: 'An error has occurred loading browser fields',
  }
);

export const ADD_TO_EXISTING_CASE = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.addToCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const ADD_TO_NEW_CASE = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.addToNewCase',
  {
    defaultMessage: 'Add to new case',
  }
);

export const NO_ALERTS_ADDED_TO_CASE = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.noAlertsAddedToCaseTitle',
  {
    defaultMessage: 'No alerts added to the case',
  }
);

export const ALERTS_ALREADY_ATTACHED_TO_CASE = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.alertsAlreadyAttachedToCase',
  {
    defaultMessage: 'All selected alerts are already attached to the case',
  }
);

export const MARK_AS_UNTRACKED = i18n.translate(
  'xpack.triggersActionsUI.alerts.table.actions.markAsUntracked',
  {
    defaultMessage: 'Mark as untracked',
  }
);

export const MUTE = i18n.translate('xpack.triggersActionsUI.alerts.table.actions.mute', {
  defaultMessage: 'Mute',
});

export const UNMUTE = i18n.translate('xpack.triggersActionsUI.alerts.table.actions.unmute', {
  defaultMessage: 'Unmute',
});
