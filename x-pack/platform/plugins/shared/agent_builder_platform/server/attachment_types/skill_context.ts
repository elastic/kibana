/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

const SKILL_CONTEXT_TYPE = 'skill-context' as const;

const skillContextDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  readonly: z.boolean(),
});

export type SkillContextAttachmentData = z.infer<typeof skillContextDataSchema>;

/**
 * Attachment type for passing current skill content to the AI Assistant
 * when the user opens the sidebar from the skill editor.
 */
export const createSkillContextAttachmentType = (): AttachmentTypeDefinition<
  typeof SKILL_CONTEXT_TYPE,
  SkillContextAttachmentData
> => ({
  id: SKILL_CONTEXT_TYPE,
  validate: (input) => {
    const result = skillContextDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: [
        `## Skill: ${attachment.data.name}`,
        attachment.data.readonly ? '*(built-in, read-only)*' : '',
        '',
        `**Description:** ${attachment.data.description}`,
        '',
        '**Instructions:**',
        attachment.data.content,
      ].join('\n'),
    }),
  }),
  getAgentDescription: () =>
    'A skill-context attachment provides the current Agent Builder skill being edited, ' +
    'including its name, description, and full markdown instructions. ' +
    'Use it to understand the skill the user wants help with.',
  getTools: () => [],
});
