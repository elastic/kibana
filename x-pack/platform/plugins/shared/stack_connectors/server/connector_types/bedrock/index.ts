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
  GenerativeAIForObservabilityConnectorFeatureId,
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { assertURL } from '@kbn/actions-plugin/server/sub_action_framework/helpers/validators';
import { BEDROCK_CONNECTOR_ID, BEDROCK_TITLE } from '../../../common/bedrock/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/bedrock/schema';
import { Config, Secrets } from '../../../common/bedrock/types';
import { BedrockConnector } from './bedrock';
import { renderParameterTemplates } from './render';

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: BEDROCK_CONNECTOR_ID,
  name: BEDROCK_TITLE,
  getService: (params) => new BedrockConnector(params),
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

    return configObject;
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.bedrock.configurationErrorApiProvider', {
        defaultMessage: 'Error configuring Amazon Bedrock action: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
};
