/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  INVESTIGATION_CASE_ATTACHMENT_TYPE,
  investigationCaseAttachmentPayloadSchema,
} from '../../common/cases_bridge';

type UnifiedAttachmentTypeSetup = Parameters<
  CasesServerSetup['attachmentFramework']['registerAttachment']
>[0];

export const investigationNotFoundMessage = (id: string) =>
  `Investigation ${id} was not found or you don't have access to it.`;

/**
 * A reference from a case to an AlertZero investigation. `resolve` checks the requester can open
 * the investigation and stamps its current title, so a case never links an investigation its
 * author couldn't see.
 */
export const createInvestigationCaseAttachmentType = (
  getAgentBuilder: () => Promise<AgentBuilderPluginStart>
): UnifiedAttachmentTypeSetup => ({
  id: INVESTIGATION_CASE_ATTACHMENT_TYPE,
  schema: investigationCaseAttachmentPayloadSchema,
  workflowSchema: false,
  resolve: async (payload, { request }) => {
    const parsed = investigationCaseAttachmentPayloadSchema.parse(payload);
    const { conversations } = await getAgentBuilder();
    const client = await conversations.getScopedClient({ request });
    const investigation = (await client.bulkGet([parsed.attachmentId])).get(parsed.attachmentId);
    if (!investigation || investigation.template_id !== 'investigation') {
      throw Boom.badRequest(investigationNotFoundMessage(parsed.attachmentId));
    }
    return {
      ...payload,
      metadata: { ...parsed.metadata, title: investigation.title },
    };
  },
});
