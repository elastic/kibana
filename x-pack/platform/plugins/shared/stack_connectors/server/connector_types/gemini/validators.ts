/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Secrets } from '@kbn/connector-schemas/gemini';

export const validateGeminiSecrets = (secrets: Secrets) => {
  if (!secrets.credentialsJson) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.gemini.validation.missingCredentialsError', {
        defaultMessage: 'Google Service Account credentials JSON is required.',
      })
    );
  }

  let credentials;
  try {
    credentials = JSON.parse(secrets.credentialsJson);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.gemini.validation.invalidJsonError', {
        defaultMessage: 'Invalid JSON format for credentials.',
      })
    );
  }

  if (credentials.type !== 'service_account') {
    throw new Error(
      i18n.translate('xpack.stackConnectors.gemini.validation.invalidCredentialTypeError', {
        defaultMessage:
          'Invalid credential type. Only "service_account" credentials are supported. Type was "{type}".',
        values: { type: credentials.type },
      })
    );
  }
};
