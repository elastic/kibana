/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptFactoryParams, PromptFactory } from './types';
import { getResearchAgentPrompt } from './research_agent';
import { getAnswerAgentPrompt, getStructuredAnswerPrompt } from './answer_agent';

export const createPromptFactory = (params: PromptFactoryParams): PromptFactory => {
  return {
    getMainPrompt: async (args) => {
      return getResearchAgentPrompt({
        ...params,
        ...args,
      });
    },
    getAnswerPrompt: async (args) => {
      return getAnswerAgentPrompt({
        ...params,
        ...args,
      });
    },
    getStructuredAnswerPrompt: async (args) => {
      return getStructuredAnswerPrompt({
        ...params,
        ...args,
      });
    },
  };
};
