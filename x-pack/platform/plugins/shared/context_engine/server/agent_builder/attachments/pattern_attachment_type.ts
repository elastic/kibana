/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  PATTERN_ATTACHMENT_TYPE,
  contextEngineToolIds,
} from '../../../common/agent_builder/constants';
import type { PatternAttachmentData } from '../../../common/agent_builder/pattern_attachment';
import { isPatternAttachmentData } from '../../../common/agent_builder/pattern_attachment';

/**
 * Attachment carrying a detected failure pattern into a management-agent
 * conversation so the agent can propose an improvement. Created by value (the
 * UI passes the pattern), so no `resolve` hook.
 */
export const createPatternAttachmentType = (): AttachmentTypeDefinition<
  typeof PATTERN_ATTACHMENT_TYPE,
  PatternAttachmentData
> => ({
  id: PATTERN_ATTACHMENT_TYPE,
  validate: (input) =>
    isPatternAttachmentData(input)
      ? { valid: true, data: input }
      : { valid: false, error: 'Invalid pattern attachment payload.' },
  format: () => ({}),
  getTools: () => [
    contextEngineToolIds.getAiIndex,
    contextEngineToolIds.updateAiIndex,
    contextEngineToolIds.saveAutomation,
  ],
  getAgentDescription: () =>
    'A detected failure pattern to resolve. Load the propose-improvement skill, verify the pattern against the source, and propose one improvement.',
});
