/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NO_API_INTEGRATION_KEY_CALLOUT_TITLE = i18n.translate(
  'xpack.siem.detectionEngine.noApiIntegrationKeyCallOutTitle',
  {
    defaultMessage: 'API integration key required',
  }
);

export const NO_API_INTEGRATION_KEY_CALLOUT_MSG = i18n.translate(
  'xpack.siem.detectionEngine.noApiIntegrationKeyCallOutMsg',
  {
    defaultMessage: `Generating a random key for xpack.encryptedSavedObjects.encryptionKey.
      To be able to decrypt encrypted saved objects attributes after restart,
      please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`,
  }
);

export const DISMISS_CALLOUT = i18n.translate(
  'xpack.siem.detectionEngine.dismissNoApiIntegrationKeyButton',
  {
    defaultMessage: 'Dismiss',
  }
);
