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
import type { TraceService } from '../services/trace_service';
import { traceAttachment } from './trace_attachment_type';

/** Registers the readonly investigation_trace type with Agent Builder. */
export const registerTraceAttachment = (
  agentBuilder: AgentBuilderPluginSetup,
  {
    getTraceService,
    privileges,
    assertCanReadConversation,
    logger,
  }: {
    getTraceService: () => TraceService;
    privileges: InvestigationsPrivilegesChecker;
    assertCanReadConversation: AssertCanReadConversation;
    logger: Logger;
  }
): void => {
  traceAttachment.registerAttachmentType(agentBuilder, {
    getService: () => getTraceService().getDocumentService(),
    assertCanRead: (request) => privileges.assertCanRead(request),
    assertCanReadConversation,
    logger,
  });
};

export { formatTraceForAgent, traceAttachment } from './trace_attachment_type';
