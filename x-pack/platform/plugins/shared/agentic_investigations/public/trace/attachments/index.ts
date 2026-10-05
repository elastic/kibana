/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import { traceAttachmentRenderer } from './trace_attachment_definition';

/** Registers the investigation_trace flyout/inline renderer with Agent Builder. */
export const registerTraceAttachmentTypes = (agentBuilder: AgentBuilderPluginStart): void => {
  registerInvestigationAttachmentRenderer(agentBuilder, traceAttachmentRenderer);
};
