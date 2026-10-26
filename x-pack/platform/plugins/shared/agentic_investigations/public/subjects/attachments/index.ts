/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { registerInvestigationAttachmentRenderer } from '../../investigation_attachments';
import { createSubjectAttachmentRenderer } from './subject_attachment_definition';
import type { SubjectServices } from './subject_services';

/** Registers the investigation subject flyout/inline renderer with Agent Builder. */
export const registerSubjectAttachmentTypes = (
  agentBuilder: AgentBuilderPluginStart,
  services: SubjectServices
): void => {
  registerInvestigationAttachmentRenderer(agentBuilder, createSubjectAttachmentRenderer(services));
};
