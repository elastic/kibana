/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { OpenAiProviderType, SUB_ACTION } from '../../../common/openai/constants';
import type { RunActionParams } from '../../../common/openai/types';

export interface ActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: RunActionParams;
}

export interface Config {
  apiProvider: OpenAiProviderType;
  apiUrl: string;
  defaultModel?: string;
  headers?: Record<string, string>;
  // PKI properties are only used when apiProvider is OpenAiProviderType.Other
  certificateData?: string;
  privateKeyData?: string;
  verificationMode?: 'full' | 'certificate' | 'none';
  caData?: string;
}

export interface InternalConfig {
  hasPKI: boolean;
}

export interface Secrets {
  apiKey: string;
}

export type OpenAIConnector = ConnectorTypeModel<Config, Secrets, ActionParams>;
export type OpenAIActionConnector = UserConfiguredActionConnector<Config, Secrets>;
