/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';

interface GenAiConfig {
  apiProvider?: OpenAiProviderType;
  apiUrl?: string;
  defaultModel?: string;
}

/**
 * Returns the GenAiConfig for a given ActionConnector. Note that if the connector is preconfigured,
 * the config will be undefined as the connector is neither available nor editable.
 *
 * TODO: Extract and use separate types from GenAiConfig from '@kbn/stack-connectors-plugin/common/gen_ai/types'
 *
 * @param connector
 */
export const getGenAiConfig = (connector: ActionConnector | undefined): GenAiConfig | undefined => {
  if (!connector?.isPreconfigured) {
    return (connector as ActionConnectorProps<GenAiConfig, unknown>)?.config;
  }
  return undefined;
};
