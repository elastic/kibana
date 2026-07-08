/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  AgentBuilderConnectorFeatureId,
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  WorkdayConfigSchema,
  WorkdaySecretsSchema,
  type WorkdayConfig,
  type WorkdaySecrets,
} from '@kbn/connector-schemas/workday';

import { WorkdayConnector } from './workday';

export const getWorkdayConnectorType = (): SubActionConnectorType<
  WorkdayConfig,
  WorkdaySecrets
> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new WorkdayConnector(params),
  schema: {
    config: WorkdayConfigSchema,
    secrets: WorkdaySecretsSchema,
  },
  validators: [
    { type: ValidatorType.CONFIG, validator: urlAllowListValidator('apiUrl') },
    { type: ValidatorType.CONFIG, validator: urlAllowListValidator('tokenUrl') },
  ],
  supportedFeatureIds: [
    AlertingConnectorFeatureId,
    CasesConnectorFeatureId,
    WorkflowsConnectorFeatureId,
    AgentBuilderConnectorFeatureId,
  ],
  minimumLicenseRequired: 'platinum' as const,
});
