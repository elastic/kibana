/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { OpenAiProviderType } from '../adapters/openai/types';

export const isNativeFunctionCallingSupported = (connector: InferenceConnector): boolean => {
  switch (connector.type) {
    case InferenceConnectorType.OpenAI:
      const apiProvider = (connector.config.apiProvider as OpenAiProviderType) ?? undefined;

      // defaulting to `true` when the config is not accessible
      if (!apiProvider) return true;

      if (apiProvider === OpenAiProviderType.Other) {
        // Allow opting into native function calling for OpenAI-compatible providers via connector config
        return connector.config.enableNativeFunctionCalling === true;
      }

      return true;
    case InferenceConnectorType.Inference:
      // note: later we might need to check the provider type, for now let's assume support
      //       will be handled by ES and that all providers will support native FC.
      return true;
    case InferenceConnectorType.Bedrock:
      return true;
    case InferenceConnectorType.Gemini:
      return true;
  }
};
