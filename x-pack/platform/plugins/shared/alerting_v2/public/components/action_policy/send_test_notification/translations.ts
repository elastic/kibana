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

export const SYNTHETIC_DATA_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.syntheticData.title',
  { defaultMessage: 'The test notification uses synthetic data' }
);

export const SYNTHETIC_DATA_TEXT = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.syntheticData.text',
  {
    defaultMessage:
      'Alerts and rules are placeholders built from the policy configuration, and their ids start with "test-". Alert links point to alerts that do not exist. Alert data only holds placeholder values for the fields the policy groups by, and rule names are placeholders.',
  }
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

export const UNSUPPORTED_MATCHER_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.unsupportedMatcher.title',
  { defaultMessage: 'Policies with a matching query are not supported yet' }
);

export const UNSUPPORTED_MATCHER_TEXT = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.unsupportedMatcher.text',
  {
    defaultMessage:
      'Synthetic alerts that satisfy the matching query of this policy cannot be generated yet, so no test notification can be sent.',
  }
);

export const PREVIEW_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.previewError.title',
  { defaultMessage: 'Failed to build the test notification' }
);

export const DESTINATIONS_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.sendTestNotification.destinations.title',
  { defaultMessage: 'Destinations' }
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
