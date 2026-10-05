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
import type { TimelineService } from '../services/timeline_service';
import { timelineAttachment } from './timeline_attachment_type';

/** Registers the readonly investigation_timeline type with Agent Builder. */
export const registerTimelineAttachment = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    getTimelineService,
    privileges,
    assertCanReadConversation,
    logger,
  }: {
    getTimelineService: () => TimelineService;
    privileges: InvestigationsPrivilegesChecker;
    assertCanReadConversation: AssertCanReadConversation;
    logger: Logger;
  }
): void => {
  timelineAttachment.registerAttachmentType(agentBuilder, {
    getService: () => getTimelineService().getDocumentService(),
    assertCanRead: (request) => privileges.assertCanRead(request),
    assertCanReadConversation,
    logger,
  });
};

export { formatTimelineForAgent, timelineAttachment } from './timeline_attachment_type';
