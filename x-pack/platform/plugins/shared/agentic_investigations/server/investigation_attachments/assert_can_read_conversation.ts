/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { InvestigationsForbiddenError } from '../investigations/services/investigations_forbidden_error';

export type AssertCanReadConversation = (
  request: KibanaRequest,
  conversationId: string
) => Promise<void>;

/**
 * Throws unless the caller can read the conversation. `bulkGet` applies Agent Builder's space and
 * access filters and silently omits a conversation the caller cannot read, so a document read by
 * origin as the internal user only reaches a caller who could read its investigation.
 */
export const createConversationReadCheck =
  ({
    getConversationClient,
  }: {
    getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  }): AssertCanReadConversation =>
  async (request, conversationId) => {
    const client = await getConversationClient(request);
    const found = await client.bulkGet([conversationId]);
    if (!found.has(conversationId)) {
      throw new InvestigationsForbiddenError(`Conversation "${conversationId}" is not readable`);
    }
  };
