/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionConnector,
  ActionTypeModel,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';

import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { PRECONFIGURED_CONNECTOR } from './translations';

// aligns with OpenAiProviderType from '@kbn/stack-connectors-plugin/common/openai/types'
enum OpenAiProviderType {
  OpenAi = 'OpenAI',
  AzureAi = 'Azure OpenAI',
}

interface GenAiConfig {
  apiProvider?: OpenAiProviderType;
  apiUrl?: string;
  defaultModel?: string;
}

/**
 * Returns the GenAiConfig for a given ActionConnector. Note that if the connector is preconfigured,
 * the config will be undefined as the connector is neither available nor editable.
 *
 * @param connector
 */
export const getGenAiConfig = (connector: ActionConnector | undefined): GenAiConfig | undefined => {
  if (!connector?.isPreconfigured) {
    const config = (connector as ActionConnectorProps<GenAiConfig, unknown>)?.config;
    const { apiProvider, apiUrl, defaultModel } = config ?? {};

    return {
      apiProvider,
      apiUrl,
      defaultModel:
        apiProvider === OpenAiProviderType.AzureAi
          ? getAzureApiVersionParameter(apiUrl ?? '')
          : defaultModel,
    };
  }

  return undefined; // the connector is neither available nor editable
};

export const getActionTypeTitle = (actionType: ActionTypeModel): string => {
  // This is for types, it is always defined for the AI connectors
  return actionType.actionTypeTitle ?? actionType.id;
};

const getAzureApiVersionParameter = (url: string): string | undefined => {
  const urlSearchParams = new URLSearchParams(new URL(url).search);
  return urlSearchParams.get('api-version') ?? undefined;
};

export const getConnectorTypeTitle = (
  connector: ActionConnector | undefined,
  actionTypeRegistry: ActionTypeRegistryContract
) => {
  if (!connector) {
    return null;
  }
  const connectorTypeTitle =
    getGenAiConfig(connector)?.apiProvider ??
    getActionTypeTitle(actionTypeRegistry.get(connector.actionTypeId));
  const actionType = connector.isPreconfigured ? PRECONFIGURED_CONNECTOR : connectorTypeTitle;

  return actionType;
};
