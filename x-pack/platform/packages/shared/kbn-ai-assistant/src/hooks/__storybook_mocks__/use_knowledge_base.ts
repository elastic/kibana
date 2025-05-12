/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/common';
import { UseKnowledgeBaseResult } from '../use_knowledge_base';

export function useKnowledgeBase(): UseKnowledgeBaseResult {
  return {
    isInstalling: false,
    isPolling: false,
    install: async () => {},
    status: {
      loading: false,
      refresh: () => {},
      error: undefined,
      value: {
        kbState: KnowledgeBaseState.NOT_INSTALLED,
        enabled: true,
        concreteWriteIndex: undefined,
        currentInferenceId: undefined,
        isReIndexing: false,
      },
    },
    warmupModel: async () => {},
    isWarmingUpModel: false,
  };
}
