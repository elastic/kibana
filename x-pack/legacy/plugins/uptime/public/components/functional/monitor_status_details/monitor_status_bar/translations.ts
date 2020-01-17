/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const healthStatusMessageAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.healthStatusMessageAriaLabel',
  {
    defaultMessage: 'Monitor status',
  }
);

export const upLabel = i18n.translate('xpack.uptime.monitorStatusBar.healthStatusMessage.upLabel', {
  defaultMessage: 'Up',
});

export const downLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.healthStatusMessage.downLabel',
  {
    defaultMessage: 'Down',
  }
);

export const monitorUrlLinkAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.monitorUrlLinkAriaLabel',
  {
    defaultMessage: 'Monitor URL link',
  }
);

export const durationTextAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.durationTextAriaLabel',
  {
    defaultMessage: 'Monitor duration in milliseconds',
  }
);

export const timestampFromNowTextAriaLabel = i18n.translate(
  'xpack.uptime.monitorStatusBar.timestampFromNowTextAriaLabel',
  {
    defaultMessage: 'Time since last check',
  }
);

export const loadingMessage = i18n.translate('xpack.uptime.monitorStatusBar.loadingMessage', {
  defaultMessage: 'Loading…',
});
