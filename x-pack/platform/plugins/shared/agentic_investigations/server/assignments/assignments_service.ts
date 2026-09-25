/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Conversation } from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { WrongTemplateError } from './errors';

export { WrongTemplateError };

export interface AssignmentsServiceDeps {
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

export class AssignmentsService {
  private readonly getConversationClient: (
    request: KibanaRequest
  ) => Promise<ConversationPublicClient>;

  constructor({ getConversationClient }: AssignmentsServiceDeps) {
    this.getConversationClient = getConversationClient;
  }

  /**
   * Replace-in-full assignee list on any templated conversation. Requires `converse` access
   * so collaborators holding the appropriate manage privilege can assign without being the
   * conversation owner.
   *
   * Known limitation: only updates the `assignees` metadata field. On a private conversation,
   * an assignee who is not already an ACL member cannot see the conversation in their queue
   * because Agent Builder's search filters by ACL independently of assignee metadata.
   * Syncing the ACL is owner-only (`updateAccessControl`) and is tracked as a follow-up.
   */
  async assign({
    request,
    conversationId,
    assignees,
    expectedTemplate,
  }: {
    request: KibanaRequest;
    conversationId: string;
    assignees: string[];
    expectedTemplate: string;
  }): Promise<Conversation> {
    const client = await this.getConversationClient(request);

    const current = await client.get(conversationId);
    if (current.template_id !== expectedTemplate) {
      throw new WrongTemplateError(conversationId, expectedTemplate);
    }

    const { conversation } = await client.patchMetadata(
      conversationId,
      { assignees },
      { access: 'converse' }
    );
    return conversation;
  }
}
