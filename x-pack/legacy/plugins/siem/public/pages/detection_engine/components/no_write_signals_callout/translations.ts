/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_WRITE_SIGNALS_CALLOUT_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.noWriteSignalsCallOutTitle',
  {
    defaultMessage: 'Signals index permissions required',
  }
);

export const NO_WRITE_SIGNALS_CALLOUT_MSG = i18n.translate(
  'xpack.siem.detectionEngine.noWriteSignalsCallOutMsg',
  {
    defaultMessage:
      'You are currently missing the required permissions to update signals. Please contact your administrator for further assistance.',
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.siem.detectionEngine.dismissNoWriteSignalButton',
  {
    defaultMessage: 'Dismiss',
  }
);
