/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  GenerativeAIForSecurityConnectorFeatureId,
  GenerativeAIForObservabilityConnectorFeatureId,
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { assertURL } from '@kbn/actions-plugin/server/sub_action_framework/helpers/validators';
import {
  OPENAI_CONNECTOR_ID,
  OPENAI_TITLE,
  OpenAiProviderType,
} from '../../../common/openai/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/openai/schema';
import type { Config, Secrets } from '../../../common/openai/types';
import { OpenAIConnector } from './openai';
import { renderParameterTemplates } from './render';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: OPENAI_CONNECTOR_ID,
  name: OPENAI_TITLE,
  getService: (params) => new OpenAIConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: configValidator }],
  supportedFeatureIds: [
    GenerativeAIForSecurityConnectorFeatureId,
    GenerativeAIForObservabilityConnectorFeatureId,
    GenerativeAIForSearchPlaygroundConnectorFeatureId,
  ],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
});

export const configValidator = (configObject: Config, validatorServices: ValidatorServices) => {
  try {
    assertURL(configObject.apiUrl);
    urlAllowListValidator('apiUrl')(configObject, validatorServices);

    const { apiProvider } = configObject;

    if (
      apiProvider !== OpenAiProviderType.OpenAi &&
      apiProvider !== OpenAiProviderType.AzureAi &&
      apiProvider !== OpenAiProviderType.Other
    ) {
      throw new Error(
        `API Provider is not supported${
          apiProvider && (apiProvider as OpenAiProviderType).length ? `: ${apiProvider}` : ``
        }`
      );
    }

    if (
      apiProvider === OpenAiProviderType.Other &&
      (configObject.certificateFile ||
        configObject.certificateData ||
        configObject.privateKeyFile ||
        configObject.privateKeyData)
    ) {
      // Ensure certificate pair is provided
      if (!configObject.certificateFile && !configObject.certificateData) {
        throw new Error('Either certificate file or certificate data must be provided for PKI');
      }
      if (!configObject.privateKeyFile && !configObject.privateKeyData) {
        throw new Error('Either private key file or private key data must be provided for PKI');
      }

      // Validate file extensions for file paths
      if (configObject.certificateFile) {
        const certFile = Array.isArray(configObject.certificateFile)
          ? configObject.certificateFile[0]
          : configObject.certificateFile;
        if (!certFile.endsWith('.pem')) {
          throw new Error('Certificate file must end with .pem');
        }
      }
      if (configObject.privateKeyFile) {
        const keyFile = Array.isArray(configObject.privateKeyFile)
          ? configObject.privateKeyFile[0]
          : configObject.privateKeyFile;
        if (!keyFile.endsWith('.pem')) {
          throw new Error('Private key file must end with .pem');
        }
      }

      // Validate PEM format for raw data
      if (
        configObject.certificateData &&
        !configObject.certificateData.includes('-----BEGIN CERTIFICATE-----')
      ) {
        throw new Error('Certificate data must be PEM-encoded');
      }
      if (
        configObject.privateKeyData &&
        !configObject.privateKeyData.includes('-----BEGIN PRIVATE KEY-----')
      ) {
        throw new Error('Private key data must be PEM-encoded');
      }
    }

    return configObject;
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.genAi.configurationErrorApiProvider', {
        defaultMessage: 'Error configuring OpenAI action: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
};
