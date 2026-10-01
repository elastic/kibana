/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { SubjectsService } from '../services/subjects_service';
import { subjectAttachment } from './subject_attachment_type';

/** Registers the readonly investigation_subject type with Agent Builder. */
export const registerSubjectAttachment = (
  agentBuilder: AgentBuilderPluginSetup,
  { getSubjectsService, logger }: { getSubjectsService: () => SubjectsService; logger: Logger }
): void => {
  subjectAttachment.registerAttachmentType(agentBuilder, {
    getService: () => getSubjectsService().getDocumentService(),
    logger,
  });
};

export { formatSubjectForAgent, subjectAttachment } from './subject_attachment_type';
