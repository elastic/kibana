/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod';
import { skillIdMaxLength, skillIdRegexp } from '@kbn/agent-builder-common';

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
  },
  description: {
    required: i18n.translate('xpack.agentBuilder.skills.validation.description.required', {
      defaultMessage: 'Description is required.',
    }),
  },
  content: {
    required: i18n.translate('xpack.agentBuilder.skills.validation.content.required', {
      defaultMessage: 'Instructions content is required.',
    }),
  },
};

export const skillFormValidationSchema = z.object({
  id: z
    .string()
    .min(1, { message: validationMessages.id.required })
    .max(skillIdMaxLength, { message: validationMessages.id.tooLong })
    .regex(skillIdRegexp, { message: validationMessages.id.format }),
  name: z.string().min(1, { message: validationMessages.name.required }),
  description: z.string().min(1, { message: validationMessages.description.required }),
  content: z.string().min(1, { message: validationMessages.content.required }),
  tool_ids: z.array(z.string()),
});

export type SkillFormData = z.infer<typeof skillFormValidationSchema>;
