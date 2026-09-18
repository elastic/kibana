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

export interface InvestigationsServiceDeps {
  logger: Logger;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
  /** Used to validate that assignee profile UIDs exist. */
  userProfile: CoreStart['userProfile'];
}

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

    if (body.assignees.length > 0) {
      await this.validateAssignees(body.assignees);
    }

    this.logger.debug(
      `Updating assignees for investigation "${investigationId}" to [${body.assignees.join(', ')}]`
    );

    const { conversation } = await client.patchMetadata(investigationId, {
      assignees: body.assignees,
    });

    const stored = conversation.metadata?.assignees;
    return { assignees: Array.isArray(stored) ? (stored as string[]) : [] };
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
