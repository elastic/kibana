/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { assertURL } from '@kbn/actions-plugin/server/sub_action_framework/helpers/validators';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { GEMINI_CONNECTOR_ID, GEMINI_TITLE } from '../../../common/gemini/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/gemini/schema';
import { Config, Secrets } from '../../../common/gemini/types';
import { GeminiConnector } from './gemini';
import { renderParameterTemplates } from './render';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: GEMINI_CONNECTOR_ID,
  name: GEMINI_TITLE,
  getService: (params) => new GeminiConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: configValidator }],
  supportedFeatureIds: [
    GenerativeAIForSecurityConnectorFeatureId,
    GenerativeAIForSearchPlaygroundConnectorFeatureId,
    GenerativeAIForObservabilityConnectorFeatureId,
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
