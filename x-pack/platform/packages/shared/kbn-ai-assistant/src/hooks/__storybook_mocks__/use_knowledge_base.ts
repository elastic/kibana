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
    isLoading: false,
    isPolling: false,
    setupKb: async () => {},
    status: {
      loading: false,
      refresh: () => {},
      error: undefined,
      value: {
        kbState: KnowledgeBaseState.NOT_INSTALLED,
        ready: true,
        enabled: true,
      },
    },
  };
}
