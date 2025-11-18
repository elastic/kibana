/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/common';
import type { UseKnowledgeBaseResult } from '../use_knowledge_base';

export function useKnowledgeBase(): UseKnowledgeBaseResult {
  return {
    isInstalling: false,
    isPolling: false,
    install: async () => {},
    isProductDocInstalling: false,
    isProductDocUninstalling: false,
    installProductDoc: async (inferenceId: string) => {},
    uninstallProductDoc: async (inferenceId: string) => {},
    status: {
      loading: false,
      refresh: () => {},
      error: undefined,
      value: {
        inferenceModelState: InferenceModelState.NOT_INSTALLED,
        enabled: true,
        concreteWriteIndex: undefined,
        currentInferenceId: undefined,
        isReIndexing: false,
        productDocStatus: 'uninstalled',
      },
    },
    warmupModel: async () => {},
    isWarmingUpModel: false,
  };
}
