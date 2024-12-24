/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chatRoutes } from './chat/route';
import { connectorRoutes } from './connectors/route';
import { conversationRoutes } from './conversations/route';
import { functionRoutes } from './functions/route';
import { knowledgeBaseRoutes } from './knowledge_base/route';

export function getGlobalObservabilityAIAssistantServerRouteRepository() {
  return {
    ...chatRoutes,
    ...conversationRoutes,
    ...connectorRoutes,
    ...functionRoutes,
    ...knowledgeBaseRoutes,
  };
}

export type ObservabilityAIAssistantServerRouteRepository = ReturnType<
  typeof getGlobalObservabilityAIAssistantServerRouteRepository
>;
