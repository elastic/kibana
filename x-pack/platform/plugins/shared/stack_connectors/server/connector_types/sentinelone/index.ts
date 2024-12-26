/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import { SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { SENTINELONE_CONNECTOR_ID, SENTINELONE_TITLE } from '../../../common/sentinelone/constants';
import {
  SentinelOneConfigSchema,
  SentinelOneSecretsSchema,
} from '../../../common/sentinelone/schema';
import { SentinelOneConfig, SentinelOneSecrets } from '../../../common/sentinelone/types';
import { SentinelOneConnector } from './sentinelone';
import { renderParameterTemplates } from './render';

export const getSentinelOneConnectorType = (): SubActionConnectorType<
  SentinelOneConfig,
  SentinelOneSecrets
> => ({
  id: SENTINELONE_CONNECTOR_ID,
  name: SENTINELONE_TITLE,
  getService: (params) => new SentinelOneConnector(params),
  schema: {
    config: SentinelOneConfigSchema,
    secrets: SentinelOneSecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  supportedFeatureIds: [SecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
  renderParameterTemplates,
});
