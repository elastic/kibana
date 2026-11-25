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
import { MAX_ESCALATION_ASSIGNEES } from '../../common/escalations/constants';
import { WrongTemplateError } from './errors';

export { WrongTemplateError };

export interface AssignmentsServiceDeps {
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

/**
 * Outcome of `addAssignee`. Anything other than `'assigned'` means nothing was written:
 * - `already_assigned`: the assignee is already listed.
 * - `has_assignees`: `onlyIfUnassigned` was set and the conversation already has assignees.
 * - `limit_reached`: the list already holds `MAX_ESCALATION_ASSIGNEES` entries.
 */
export type AddAssigneeResult = 'assigned' | 'already_assigned' | 'has_assignees' | 'limit_reached';

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
   * conversation owner. See `writeAssignees` for how the ACL follows the list.
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
    const current = await this.getTemplated(client, conversationId, expectedTemplate);
    return this.writeAssignees(client, conversationId, current, assignees);
  }

  /**
   * Appends one assignee, keeping the others. The list is recomputed from a fresh read right
   * before the write, so assignees changed since the caller last read the conversation are kept.
   * Never grows the list past `MAX_ESCALATION_ASSIGNEES`, the bound the assign routes enforce.
   */
  async addAssignee({
    request,
    conversationId,
    assignee,
    expectedTemplate,
    onlyIfUnassigned = false,
  }: {
    request: KibanaRequest;
    conversationId: string;
    assignee: string;
    expectedTemplate: string;
    /** Leaves a conversation that already has any assignee untouched. */
    onlyIfUnassigned?: boolean;
  }): Promise<AddAssigneeResult> {
    const client = await this.getConversationClient(request);
    const current = await this.getTemplated(client, conversationId, expectedTemplate);

    const previous = [...new Set(toStringArray(current.metadata?.assignees))];
    if (previous.includes(assignee)) return 'already_assigned';
    if (onlyIfUnassigned && previous.length > 0) return 'has_assignees';
    if (previous.length >= MAX_ESCALATION_ASSIGNEES) return 'limit_reached';

    await this.writeAssignees(client, conversationId, current, [...previous, assignee]);
    return 'assigned';
  }

  private async getTemplated(
    client: ConversationPublicClient,
    conversationId: string,
    expectedTemplate: string
  ): Promise<Conversation> {
    const current = await client.get(conversationId);
    if (current.template_id !== expectedTemplate) {
      throw new WrongTemplateError(conversationId, expectedTemplate);
    }
    return current;
  }

  /**
   * Writes `assignees` as the conversation's full assignee list.
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
   * - The diff is computed from `current`, read outside OCC, so concurrent writes can race (same
   *   as other multi-step writes in this plugin, e.g. linked_investigations). `addAssignee` keeps
   *   that window to a single read-then-write; `assign` callers that computed the list from an
   *   earlier read widen it.
   * - An assignee who was never an ACL member (escalation created before add-sync) makes
   *   removeAccessControlEntries a no-op, which is safe.
   */
  private async writeAssignees(
    client: ConversationPublicClient,
    conversationId: string,
    current: Conversation,
    assignees: string[]
  ): Promise<Conversation> {
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
      { access: 'converse', refresh: 'wait_for' }
    );

    return conversation;
  }
}
