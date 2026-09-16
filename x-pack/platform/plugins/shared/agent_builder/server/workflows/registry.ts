/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ConversationClient } from '../services/conversation';
import type { AgentRegistry } from '../services/agents';
import { getConversationMetadataStepDefinition } from './steps/get_conversation_metadata';
import { updateConversationMetadataStepDefinition } from './steps/update_conversation_metadata';
import { createConversationStepDefinition } from './steps/create_conversation';

export interface ConversationStepDeps {
  getConversationClient: (request: KibanaRequest) => Promise<ConversationClient>;
  getAgentRegistry: (request: KibanaRequest) => Promise<AgentRegistry>;
  isExperimentalEnabled: (request: KibanaRequest) => Promise<boolean>;
}

type ConversationStepFactory = (deps: ConversationStepDeps) => ServerStepDefinition;

/**
 * Single source of truth for all agent builder conversation workflow steps.
 * Adding a new step here registers it in the workflow engine automatically.
 */
export const conversationStepRegistry: ConversationStepFactory[] = [
  getConversationMetadataStepDefinition,
  updateConversationMetadataStepDefinition,
  createConversationStepDefinition,
];
