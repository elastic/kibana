/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';

import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';

import type { ConnectorTypeConfigType } from '@kbn/connector-schemas/http';
import { AuthType, SSLCertType } from '@kbn/connector-schemas/common/auth';
import { ADDITIONAL_FIELD_CONFIG_ERROR } from './translations';

function validateUrl(configuredUrl: string) {
  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.http.configurationErrorNoHostname', {
        defaultMessage: 'error validation http action config: unable to parse url: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
}

function ensureUriAllowed(
  configuredUrl: string,
  configurationUtilities: ActionsConfigurationUtilities
) {
  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.http.configurationError', {
        defaultMessage: 'error validation http action config: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

function validateAuthType(configObject: ConnectorTypeConfigType) {
  if (Boolean(configObject.authType) && !configObject.hasAuth) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.http.authConfigurationError', {
        defaultMessage:
          'error validation http action config: authType must be null or undefined if hasAuth is false',
      })
    );
  }
}

function validateCertType(
  configObject: ConnectorTypeConfigType,
  configurationUtilities: ActionsConfigurationUtilities
) {
  if (configObject.certType === SSLCertType.PFX) {
    const webhookSettings = configurationUtilities.getWebhookSettings();
    if (!webhookSettings.ssl.pfx.enabled) {
      throw new Error(
        i18n.translate('xpack.stackConnectors.http.pfxConfigurationError', {
          defaultMessage: 'error validation http action config: certType "{certType}" is disabled',
          values: {
            certType: SSLCertType.PFX,
          },
        })
      );
    }
  }
}

function validateAdditionalFields(configObject: ConnectorTypeConfigType) {
  if (configObject.additionalFields) {
    try {
      const parsedAdditionalFields = JSON.parse(configObject.additionalFields);

      if (
        typeof parsedAdditionalFields !== 'object' ||
        Array.isArray(parsedAdditionalFields) ||
        Object.keys(parsedAdditionalFields).length === 0
      ) {
        throw new Error(ADDITIONAL_FIELD_CONFIG_ERROR);
      }
    } catch (e) {
      throw new Error(ADDITIONAL_FIELD_CONFIG_ERROR);
    }
  }
}

function validateOAuth2(configObject: ConnectorTypeConfigType) {
  if (
    configObject.authType === AuthType.OAuth2ClientCredentials &&
    (!configObject.accessTokenUrl || !configObject.clientId)
  ) {
    const missingFields = [];
    if (!configObject.accessTokenUrl) {
      missingFields.push('Access Token URL (accessTokenUrl)');
    }
    if (!configObject.clientId) {
      missingFields.push('Client ID (clientId)');
    }

    throw new Error(
      i18n.translate('xpack.stackConnectors.http.oauth2ConfigurationError', {
        defaultMessage: `error validation http action config: missing {missingItems} fields`,
        values: {
          missingItems: missingFields.join(', '),
        },
      })
    );
  }
}

export function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredBasePath = configObject.url;

  validateUrl(configuredBasePath);
  ensureUriAllowed(configuredBasePath, configurationUtilities);
  validateAuthType(configObject);
  validateCertType(configObject, configurationUtilities);
  validateAdditionalFields(configObject);
  validateOAuth2(configObject);
}
