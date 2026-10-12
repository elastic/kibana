/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import { subjectAttachmentRenderer } from './subject_attachment_definition';

/** Registers the investigation subject flyout/inline renderer with Agent Builder. */
export const registerSubjectAttachmentTypes = (agentBuilder: AgentBuilderPluginStart): void => {
  registerInvestigationAttachmentRenderer(agentBuilder, subjectAttachmentRenderer);
};
