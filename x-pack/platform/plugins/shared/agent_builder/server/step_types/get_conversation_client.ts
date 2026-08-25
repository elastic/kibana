/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ServiceManager } from '../services';
import type { ConversationClient } from '../services/conversation';

/**
 * Resolves a conversation client scoped to the workflow's executing user and space.
 *
 * The scoped client is the only supported entry point: it resolves the user, applies the
 * space filter, and enforces access control in application code. Querying the conversation
 * index directly would bypass all of that.
 *
 * The request is returned alongside the client for the callers that need to scope another
 * service to the same user.
 */
export const getConversationClient = async (
  serviceManager: ServiceManager,
  contextManager: StepHandlerContext['contextManager']
): Promise<{ client: ConversationClient; request: KibanaRequest }> => {
  const request = contextManager.getFakeRequest();
  if (!request) {
    throw new Error('No request available in workflow context');
  }

  const conversations = serviceManager.internalStart?.conversations;
  if (!conversations) {
    throw new Error('conversation service is not available');
  }

  return { client: await conversations.getScopedClient({ request }), request };
};
