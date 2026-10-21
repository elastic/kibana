/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import type { AssertCanReadConversation } from '../../investigation_attachments';
import type { ImpactService } from '../services/impact_service';
import { impactAttachment } from './impact_attachment_type';

/** Registers the readonly investigation_impact type with Agent Builder. */
export const registerImpactAttachment = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    getImpactService,
    privileges,
    assertCanReadConversation,
    logger,
  }: {
    getImpactService: () => ImpactService;
    privileges: InvestigationsPrivilegesChecker;
    assertCanReadConversation: AssertCanReadConversation;
    logger: Logger;
  }
): void => {
  impactAttachment.registerAttachmentType(agentBuilder, {
    getService: () => getImpactService().getDocumentService(),
    assertCanRead: (request) => privileges.assertCanRead(request),
    assertCanReadConversation,
    logger,
  });
};

export { attachImpactToInvestigation } from './attach_impact_to_investigation';
export { attachImpactFromTool } from './attach_impact_from_tool';
export { formatImpactForAgent, impactAttachment } from './impact_attachment_type';
