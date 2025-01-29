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
import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
  UptimeConnectorFeatureId,
  CasesConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { TheHiveConnector } from './thehive';
import {
  TheHiveConfigSchema,
  TheHiveSecretsSchema,
  PushToServiceIncidentSchema,
} from '../../../common/thehive/schema';
import { THEHIVE_CONNECTOR_ID, THEHIVE_TITLE } from '../../../common/thehive/constants';
import { TheHiveConfig, TheHiveSecrets } from '../../../common/thehive/types';

export type TheHiveConnectorType = SubActionConnectorType<TheHiveConfig, TheHiveSecrets>;

export function getConnectorType(): TheHiveConnectorType {
  return {
    id: THEHIVE_CONNECTOR_ID,
    minimumLicenseRequired: 'platinum',
    name: THEHIVE_TITLE,
    getService: (params) => new TheHiveConnector(params, PushToServiceIncidentSchema),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      SecurityConnectorFeatureId,
      UptimeConnectorFeatureId,
      CasesConnectorFeatureId,
    ],
    schema: {
      config: TheHiveConfigSchema,
      secrets: TheHiveSecretsSchema,
    },
    validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  };
}
