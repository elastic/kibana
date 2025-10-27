/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionConnectorProps } from '@kbn/alerts-ui-shared';
import type { SUB_ACTION } from '../../../common/bedrock/constants';
import type { RunActionParams } from '../../../common/bedrock/types';

export interface BedrockActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: RunActionParams;
  actionConnector: ActionConnectorProps<Config, Secrets>;
}

export interface Config {
  apiUrl: string;
  defaultModel: string;
  extendedThinking?: boolean;
  budgetTokens?: number;
}

export interface Secrets {
  accessKey: string;
  secret: string;
}

export type BedrockConnector = ConnectorTypeModel<Config, Secrets, BedrockActionParams>;
