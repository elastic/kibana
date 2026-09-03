/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ConversationClient } from '../services/conversation';
import { getConversationMetadataStepDefinition } from './steps/get_conversation_metadata';
import { updateConversationMetadataStepDefinition } from './steps/update_conversation_metadata';

type GetConversationClientFn = (request: KibanaRequest) => Promise<ConversationClient>;

type ConversationStepFactory = (
  getConversationClient: GetConversationClientFn,
  isExperimentalEnabled: (request: KibanaRequest) => Promise<boolean>
) => ServerStepDefinition;

/**
 * Single source of truth for all agent builder conversation workflow steps.
 * Adding a new step here registers it in the workflow engine automatically.
 */
export const conversationStepRegistry: ConversationStepFactory[] = [
  getConversationMetadataStepDefinition,
  updateConversationMetadataStepDefinition,
];
