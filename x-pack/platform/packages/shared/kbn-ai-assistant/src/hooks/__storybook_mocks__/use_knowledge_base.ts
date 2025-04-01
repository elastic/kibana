/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseKnowledgeBaseResult } from '../use_knowledge_base';

export function useKnowledgeBase(): UseKnowledgeBaseResult {
  return {
    install: async () => {},
    isInstalling: false,
    status: {
      loading: false,
      refresh: () => {},
      error: undefined,
      value: {
        ready: true,
        enabled: true,
      },
    },
  };
}
