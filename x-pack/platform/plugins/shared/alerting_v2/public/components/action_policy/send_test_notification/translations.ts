/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEND_TEST_NOTIFICATION = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.menuItem',
  { defaultMessage: 'Send test notification' }
);

export const FLYOUT_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.title',
  { defaultMessage: 'Send test notification' }
);

export const REAL_CHANNELS_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.realChannels.title',
  { defaultMessage: 'Notifications are sent to real channels' }
);

export const REAL_CHANNELS_TEXT = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.realChannels.text',
  {
    defaultMessage:
      'Each selected workflow runs as a test run with your credentials, and every step runs, so messages reach real people. Workflows can detect test runs with execution.isTestRun.',
  }
);

export const KQL_MATCHER_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.kqlMatcher.title',
  { defaultMessage: 'Alert values may not match this policy' }
);

export const KQL_MATCHER_TEXT = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.kqlMatcher.text',
  {
    defaultMessage:
      "The test alerts are not generated to satisfy this policy's matching query, so their values can differ from the alerts it receives in production.",
  }
);

export const PREVIEW_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.previewError.title',
  { defaultMessage: 'Failed to build the test notification' }
);

export const DESTINATIONS_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.destinations.title',
  { defaultMessage: 'Send to' }
);

export const NOT_EXECUTABLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.notExecutable',
  { defaultMessage: 'Not executable' }
);

export const NOT_EXECUTABLE_TOOLTIP = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.notExecutable.tooltip',
  { defaultMessage: 'You do not have permission to run this workflow, or it does not exist.' }
);

export const PAYLOAD_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.payload.title',
  { defaultMessage: 'Payload' }
);

export const NO_PAYLOAD = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.payload.empty',
  { defaultMessage: 'No payload to preview.' }
);

export const CLOSE = i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.close', {
  defaultMessage: 'Close',
});

export const SEND = i18n.translate('xpack.alertingV2.actionPolicy.sendTestNotification.send', {
  defaultMessage: 'Send',
});
