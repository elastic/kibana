/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { START as _START_, END as _END_ } from '@langchain/langgraph';
import type { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createDeepAgent } from '@kbn/securitysolution-deep-agent';
import type { ResolvedConfiguration } from '../types';
import { createReasoningEventMiddleware } from './middlewares/reasoningEventMiddleware';
import { createAnswerMiddleware } from './middlewares/answerMiddleware';
import { createResearchMiddleware } from './middlewares/researchMiddleware';

export const createAgentGraph = ({
  chatModel,
  tools,
  configuration,
  capabilities,
  logger,
  events,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  capabilities: ResolvedAgentCapabilities;
  configuration: ResolvedConfiguration;
  logger: Logger;
  events: AgentEventEmitter;
}) => {

  // Create the deep agent instance for research
  const graph = createDeepAgent({
    systemPrompt: configuration.research.instructions,
    model: chatModel,
    tools,
    middleware: [
      createResearchMiddleware(events),
      createReasoningEventMiddleware(events),
      createAnswerMiddleware(events)
    ],
  });


  return graph;
};
