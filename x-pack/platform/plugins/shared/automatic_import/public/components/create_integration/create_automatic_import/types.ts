/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import type Oas from 'oas';
import type { CelAuthType, InputType, SamplesFormat } from '../../../../common';

interface GenAiConfig {
  apiUrl?: string;
  defaultModel?: string;
}

export type AIConnector = ActionConnector<GenAiConfig> & {
  // related to OpenAI connectors, ex: Azure OpenAI, OpenAI
  apiProvider?: OpenAiProviderType;
};
export type ConfiguredAIConnectorType = UserConfiguredActionConnector<
  GenAiConfig,
  Record<string, unknown>
>;

export interface IntegrationSettings {
  title?: string;
  description?: string;
  logo?: string;
  name?: string;
  dataStreamTitle?: string;
  dataStreamDescription?: string;
  dataStreamName?: string;
  inputTypes?: InputType[];
  logSamples?: string[];
  samplesFormat?: SamplesFormat;
  apiSpec?: Oas;
  apiSpecFileName?: string;
  celUrl?: string;
  celPath?: string;
  celAuth?: CelAuthType;
}

export interface ApiPathOptions {
  [key: string]: string;
}
