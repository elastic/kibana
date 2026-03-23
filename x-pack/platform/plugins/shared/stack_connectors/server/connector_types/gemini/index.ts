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
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { assertURL } from '@kbn/actions-plugin/server/sub_action_framework/helpers/validators';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  SecretsSchema,
  type Config,
  type Secrets,
} from '@kbn/connector-schemas/gemini';
import { GeminiConnector } from './gemini';
import { renderParameterTemplates } from './render';
import { validateGeminiSecrets } from './validators';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new GeminiConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [
    { type: ValidatorType.CONFIG, validator: configValidator },
    { type: ValidatorType.SECRETS, validator: secretsValidator },
  ],
  supportedFeatureIds: [
    GenerativeAIForSecurityConnectorFeatureId,
    GenerativeAIForSearchPlaygroundConnectorFeatureId,
    GenerativeAIForObservabilityConnectorFeatureId,
    WorkflowsConnectorFeatureId,
  ],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
});

export const configValidator = (configObject: Config, validatorServices: ValidatorServices) => {
  try {
    assertURL(configObject.apiUrl);
    urlAllowListValidator('apiUrl')(configObject, validatorServices);

    return configObject;
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.gemini.configurationErrorApiProvider', {
        defaultMessage: 'Error configuring Google Gemini action: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
};

export const secretsValidator = (secrets: Secrets, validatorServices: ValidatorServices) => {
  try {
    validateGeminiSecrets(secrets);
    return secrets;
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.gemini.configurationErrorSecrets', {
        defaultMessage: 'Error configuring Google Gemini secrets: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
};
