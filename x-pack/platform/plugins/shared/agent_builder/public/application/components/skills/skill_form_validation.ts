/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import {
  skillIdMaxLength,
  skillNameMaxLength,
  skillIdRegexp,
  skillNameRegexp,
  maxToolsPerSkill,
} from '@kbn/agent-builder-common';

const validationMessages = {
  id: {
    required: i18n.translate('xpack.agentBuilder.skills.validation.id.required', {
      defaultMessage: 'ID is required.',
    }),
    tooLong: i18n.translate('xpack.agentBuilder.skills.validation.id.tooLong', {
      defaultMessage: 'ID must be at most {maxLength} characters.',
      values: { maxLength: skillIdMaxLength },
    }),
    format: i18n.translate('xpack.agentBuilder.skills.validation.id.format', {
      defaultMessage:
        'ID must start and end with a letter or number, and contain only lowercase letters, numbers, hyphens, and underscores.',
    }),
  },
  name: {
    required: i18n.translate('xpack.agentBuilder.skills.validation.name.required', {
      defaultMessage: 'Name is required.',
    }),
    tooLong: i18n.translate('xpack.agentBuilder.skills.validation.name.tooLong', {
      defaultMessage: 'Name must be at most {maxLength} characters.',
      values: { maxLength: skillNameMaxLength },
    }),
    format: i18n.translate('xpack.agentBuilder.skills.validation.name.format', {
      defaultMessage:
        'Name must start and end with a letter or number, and contain only letters, numbers, spaces, hyphens, and underscores.',
    }),
  },
  description: {
    required: i18n.translate('xpack.agentBuilder.skills.validation.description.required', {
      defaultMessage: 'Description is required.',
    }),
    tooLong: i18n.translate('xpack.agentBuilder.skills.validation.description.tooLong', {
      defaultMessage: 'Description must be at most {maxLength} characters.',
      values: { maxLength: 1024 },
    }),
  },
  content: {
    required: i18n.translate('xpack.agentBuilder.skills.validation.content.required', {
      defaultMessage: 'Instructions content is required.',
    }),
  },
  toolIds: {
    max: i18n.translate('xpack.agentBuilder.skills.validation.toolIds.max', {
      defaultMessage: 'A maximum of {max} tools can be associated with a skill.',
      values: { max: maxToolsPerSkill },
    }),
  },
};

export const skillFormValidationSchema = z.object({
  id: z
    .string()
    .min(1, { message: validationMessages.id.required })
    .max(skillIdMaxLength, { message: validationMessages.id.tooLong })
    .regex(skillIdRegexp, { message: validationMessages.id.format }),
  name: z
    .string()
    .min(1, { message: validationMessages.name.required })
    .max(skillNameMaxLength, { message: validationMessages.name.tooLong })
    .regex(skillNameRegexp, { message: validationMessages.name.format }),
  description: z
    .string()
    .min(1, { message: validationMessages.description.required })
    .max(1024, { message: validationMessages.description.tooLong }),
  content: z.string().min(1, { message: validationMessages.content.required }),
  tool_ids: z.array(z.string()).max(maxToolsPerSkill, { message: validationMessages.toolIds.max }),
});

export type SkillFormData = z.infer<typeof skillFormValidationSchema>;
