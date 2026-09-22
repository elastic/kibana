/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/investigations/constants';
import type {
  UpdateAssigneesRequest,
  UpdateAssigneesResponse,
} from '../../../common/investigations/investigation';
import { NotAnInvestigationError, UnknownAssigneesError } from './errors';

/**
 * Reads the stored assignees from conversation metadata, handling the ES `flattened`
 * field behaviour where a single-element array is collapsed to a bare string on
 * round-trip. Returns the list as-is when it is already an array, wraps a bare string
 * in a one-element array, and returns an empty array for any other value.
 */
const readAssignees = (stored: unknown): string[] => {
  if (Array.isArray(stored)) return stored as string[];
  if (typeof stored === 'string') return [stored];
  return [];
};

export interface InvestigationsServiceDeps {
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  /** Used to validate that assignee profile UIDs exist. */
  userProfile: CoreStart['userProfile'];
}

/**
 * Server-side service for investigation operations.
 *
 * **Owner-only constraint**: `ConversationPublicClient.patchMetadata` delegates to an
 * owner-only write path; non-owners receive a 404 (masked as not-found) rather than a
 * 403. A caller holding `manage_investigations` who did not create the conversation will
 * therefore see a 404 from `updateAssignees`. This is a known limitation of the
 * underlying agent_builder conversation ACL — see the follow-up issue linked in the
 * Scout spec for `update_assignees`.
 */
export class InvestigationsService {
  private readonly logger: Logger;
  private readonly getConversationClient: (
    request: KibanaRequest
  ) => Promise<ConversationPublicClient>;
  private readonly userProfile: CoreStart['userProfile'];

  constructor({ logger, getConversationClient, userProfile }: InvestigationsServiceDeps) {
    this.logger = logger;
    this.getConversationClient = getConversationClient;
    this.userProfile = userProfile;
  }

  /**
   * Replace the assignees on an investigation conversation.
   *
   * Validates that:
   * - The conversation exists and is an investigation.
   * - Every supplied assignee profile uid exists in Kibana.
   *
   * Overwrite semantics: the supplied list fully replaces whatever is stored.
   * An empty array removes all assignees.
   */
  async updateAssignees(
    request: KibanaRequest,
    investigationId: string,
    body: UpdateAssigneesRequest
  ): Promise<UpdateAssigneesResponse> {
    const client = await this.getConversationClient(request);

    const current = await client.get(investigationId);
    if (current.template_id !== INVESTIGATION_TEMPLATE_ID) {
      throw new NotAnInvestigationError(investigationId);
    }

    const deduped = [...new Set(body.assignees)];

    if (deduped.length > 0) {
      await this.validateAssignees(deduped);
    }

    this.logger.debug(
      `Updating assignees for investigation "${investigationId}" to [${deduped.join(', ')}]`
    );

    const { conversation } = await client.patchMetadata(investigationId, {
      assignees: deduped,
    });

    return { assignees: readAssignees(conversation.metadata?.assignees) };
  }

  /**
   * Verifies that every profile uid in the list resolves to a real user.
   * Throws UnknownAssigneesError listing the unknown ones.
   */
  private async validateAssignees(assignees: string[]): Promise<void> {
    const uids = new Set(assignees);
    const profiles = await this.userProfile.bulkGet({ uids });
    const foundUids = new Set(profiles.map((p) => p.uid));
    const unknown = assignees.filter((uid) => !foundUids.has(uid));

    if (unknown.length > 0) {
      throw new UnknownAssigneesError(unknown);
    }
  }
}
