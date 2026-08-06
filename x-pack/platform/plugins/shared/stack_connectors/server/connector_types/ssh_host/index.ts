/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  CONNECTOR_ID,
  CONNECTOR_NAME,
  ConfigSchema,
  SecretsSchema,
} from '@kbn/connector-schemas/ssh_host';
import type { Config, Secrets } from '@kbn/connector-schemas/ssh_host';
import { SshHostConnector } from './ssh_host_connector';

export const getSshHostConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new SshHostConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  supportedFeatureIds: [WorkflowsConnectorFeatureId],
  minimumLicenseRequired: 'basic' as const,
});
