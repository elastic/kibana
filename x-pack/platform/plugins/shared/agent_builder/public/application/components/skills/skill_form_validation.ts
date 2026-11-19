/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import {
  skillIdMaxLength,
  skillNameMaxLength,
  skillIdRegexp,
  skillNameRegexp,
  maxToolsPerSkill,
  maxReferencedContentItems,
  collectReferencedContentRefineIssues,
  REFERENCED_CONTENT_REFINE_ISSUE_CODE,
  type ReferencedContentRefineIssueCode,
} from '@kbn/agent-builder-common';

const validationMessages = {
  name: {
    required: i18n.translate('xpack.agentBuilder.skills.validation.name.required', {
      defaultMessage: 'Name is required.',
    }),
    tooLong: i18n.translate('xpack.agentBuilder.skills.validation.name.tooLong', {
      defaultMessage: 'Name must be at most {maxLength} characters.',
      values: { maxLength: skillIdMaxLength },
    }),
    format: i18n.translate('xpack.agentBuilder.skills.validation.name.format', {
      defaultMessage:
        'Name must start and end with a lowercase letter or number, and contain only lowercase letters, numbers, hyphens, and underscores.',
    }),
  },
  referencedContentName: {
    required: i18n.translate(
      'xpack.agentBuilder.skills.validation.referencedContentName.required',
      {
        defaultMessage: 'Name is required.',
      }
    ),
    tooLong: i18n.translate('xpack.agentBuilder.skills.validation.referencedContentName.tooLong', {
      defaultMessage: 'Name must be at most {maxLength} characters.',
      values: { maxLength: skillNameMaxLength },
    }),
    format: i18n.translate('xpack.agentBuilder.skills.validation.referencedContentName.format', {
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
  referencedContent: {
    maxItems: i18n.translate('xpack.agentBuilder.skills.validation.referencedContent.maxItems', {
      defaultMessage: 'A maximum of {max} additional files can be associated with a skill.',
      values: { max: maxReferencedContentItems },
    }),
    pathProtocol: i18n.translate(
      'xpack.agentBuilder.skills.validation.referencedContent.pathProtocol',
      {
        defaultMessage: 'Folder path must start with ./.',
      }
    ),
    pathTraversal: i18n.translate(
      'xpack.agentBuilder.skills.validation.referencedContent.pathTraversal',
      {
        defaultMessage: 'Folder path must not contain "../".',
      }
    ),
    duplicatePath: i18n.translate(
      'xpack.agentBuilder.skills.validation.referencedContent.duplicatePath',
      {
        defaultMessage: 'This file path is already used by another additional file.',
      }
    ),
    reservedSkillName: i18n.translate(
      'xpack.agentBuilder.skills.validation.referencedContent.reservedSkillName',
      {
        defaultMessage: 'This name is reserved for the main instructions file.',
      }
    ),
  },
};

const referencedContentSuperRefineMessages: Record<ReferencedContentRefineIssueCode, string> = {
  [REFERENCED_CONTENT_REFINE_ISSUE_CODE.PATH_PROTOCOL]:
    validationMessages.referencedContent.pathProtocol,
  [REFERENCED_CONTENT_REFINE_ISSUE_CODE.PATH_TRAVERSAL]:
    validationMessages.referencedContent.pathTraversal,
  [REFERENCED_CONTENT_REFINE_ISSUE_CODE.DUPLICATE_PATH]:
    validationMessages.referencedContent.duplicatePath,
  [REFERENCED_CONTENT_REFINE_ISSUE_CODE.RESERVED_SKILL_NAME]:
    validationMessages.referencedContent.reservedSkillName,
};

/**
 * One additional markdown file attached to a skill (same shape as API `referenced_content` items).
 */
export interface ReferencedContentItem {
  name: string;
  relativePath: string;
  content: string;
}

const referencedContentItemSchema: z.ZodType<ReferencedContentItem> = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: validationMessages.referencedContentName.required })
    .max(skillNameMaxLength, { message: validationMessages.referencedContentName.tooLong })
    .regex(skillNameRegexp, { message: validationMessages.referencedContentName.format }),
  relativePath: z.string().trim(),
  content: z.string(),
});

const skillFormObjectSchema = z.object({
  name: z
    .string()
    .min(1, { message: validationMessages.name.required })
    .max(skillIdMaxLength, { message: validationMessages.name.tooLong })
    .regex(skillIdRegexp, { message: validationMessages.name.format }),
  description: z
    .string()
    .min(1, { message: validationMessages.description.required })
    .max(1024, { message: validationMessages.description.tooLong }),
  content: z.string().min(1, { message: validationMessages.content.required }),
  tool_ids: z.array(z.string()).max(maxToolsPerSkill, { message: validationMessages.toolIds.max }),
  referenced_content: z
    .array(referencedContentItemSchema)
    .max(maxReferencedContentItems, { message: validationMessages.referencedContent.maxItems }),
});

export const skillFormValidationSchema = skillFormObjectSchema.superRefine((data, ctx) => {
  for (const issue of collectReferencedContentRefineIssues(data.referenced_content)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: referencedContentSuperRefineMessages[issue.code],
      path: ['referenced_content', issue.itemIndex, issue.field],
    });
  }
});

export type SkillFormData = z.infer<typeof skillFormObjectSchema>;

/**
 * Sanitize input into the Name field on the fly so the user can type naturally
 * without hitting the strict kebab-case validator on every keystroke:
 * - uppercase letters are lowercased
 * - any whitespace character becomes a single hyphen
 */
export const sanitizeSkillNameInput = (value: string): string =>
  value.toLowerCase().replace(/\s/g, '-');
