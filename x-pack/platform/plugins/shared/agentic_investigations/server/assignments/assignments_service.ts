/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Conversation } from '@kbn/agent-builder-common';
import { isPublicConversation, ConversationAccessControlRole } from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { WrongTemplateError } from './errors';

export { WrongTemplateError };

export interface AssignmentsServiceDeps {
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

/** Casts a raw metadata value to `string[]`, ignoring non-string elements. */
const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
};

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
   * For private conversations the ACL follows the assignee diff:
   * - Users added to `assignees` are added as ACL members so they can see and interact with
   *   the conversation.
   * - Users removed from `assignees` are revoked from the ACL. Note: if a user was also
   *   added as an explicit collaborator (e.g. at escalation creation time), they lose ACL
   *   access too. The owner can restore their access via the access-control route.
   *
   * Public conversations are unchanged — Agent Builder rejects ACL entries on them.
   *
   * Order: add → remove → patch metadata. `metadata.assignees` is the source of the diff, so it
   * is written last: if any step fails, the previous assignee list is still intact and a retry
   * recomputes the same diff, so no stale ACL entry can be orphaned. The trade-off is that a
   * failure between remove and patch leaves a still-listed assignee without access until the
   * retry succeeds.
   *
   * Edge cases:
   * - A caller can remove themselves; the request succeeds but they lose access afterwards.
   * - The diff is computed from a read outside OCC, so concurrent reassigns can race (same
   *   as other multi-step writes in this plugin, e.g. linked_investigations).
   * - An assignee who was never an ACL member (escalation created before add-sync) makes
   *   removeAccessControlEntries a no-op, which is safe.
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

    const isPrivate = !isPublicConversation(current.access_control);
    const previous = toStringArray(current.metadata?.assignees);
    const next = [...new Set(assignees)];
    const added = next.filter((id) => !previous.includes(id));
    const removed = previous.filter((id) => !next.includes(id));

    // For private conversations: add new assignees to the ACL first so they can see the
    // conversation as soon as they are listed.
    if (isPrivate && added.length > 0) {
      await client.addAccessControlEntries(
        conversationId,
        added.map((id) => ({ type: 'user', id, role: ConversationAccessControlRole.Member })),
        { access: 'converse' }
      );
    }

    // Revoke before patching metadata: the diff is derived from `metadata.assignees`, so it must
    // only change once the ACL is in sync, otherwise a failed revoke could never be retried.
    if (isPrivate && removed.length > 0) {
      await client.removeAccessControlEntries(
        conversationId,
        removed.map((id) => ({ type: 'user', id })),
        { access: 'converse' }
      );
    }

    const { conversation } = await client.patchMetadata(
      conversationId,
      { assignees: next },
      { access: 'converse' }
    );

    return conversation;
  }
}
