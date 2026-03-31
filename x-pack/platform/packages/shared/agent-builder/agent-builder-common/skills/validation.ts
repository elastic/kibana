/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import {
  canComputeReferencedContentUniquenessKey,
  isRootRelativePath,
  maxReferencedContentItems,
  normalizeRelativePathSegments,
} from './referenced_content_shared';

export { maxReferencedContentItems } from './referenced_content_shared';

/** Maximum allowed length for a skill ID. */
export const skillIdMaxLength = 64;
/** Maximum allowed length for a skill name. */
export const skillNameMaxLength = 64;
/** Regex for valid skill IDs (lowercase alphanumeric, hyphens, underscores). */
export const skillIdRegexp = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
/** Regex for valid skill names. */
export const skillNameRegexp = /^[a-zA-Z0-9](?:[a-zA-Z0-9 _-]*[a-zA-Z0-9])?$/;
/** Maximum number of tools a skill can reference. */
export const maxToolsPerSkill = 5;

const skillNameSchema = z
  .string()
  .min(1, 'Name must be non-empty')
  .max(skillNameMaxLength, `Name must be at most ${skillNameMaxLength} characters`)
  .regex(
    skillNameRegexp,
    'Name must start and end with a letter or number, and contain only letters, numbers, spaces, hyphens, and underscores'
  );

const skillDescriptionSchema = z
  .string()
  .min(1, 'Description must be non-empty')
  .max(1024, 'Description must be at most 1024 characters');

const skillContentSchema = z.string().min(1, 'Content must be non-empty');

const referencedContentItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Reference file name must be non-empty')
    .max(skillNameMaxLength, `Reference file name must be at most ${skillNameMaxLength} characters`)
    .regex(
      skillNameRegexp,
      'Reference file name must start and end with a letter or number, and contain only letters, numbers, spaces, hyphens, and underscores'
    ),
  relativePath: z.string().trim().min(1, 'Relative path must be non-empty'),
  content: z.string(),
});

const referencedContentErrors = {
  pathProtocol: 'Folder path must start with ./.',
  pathTraversal: 'Folder path must not contain "../".',
  duplicatePath: 'This file path is already used by another additional file.',
  reservedSkillName: 'This name is reserved for the main instructions file.',
} as const;

const superRefineReferencedContent = (
  items: Array<{ name: string; relativePath: string; content: string }>,
  ctx: z.RefinementCtx
): void => {
  items.forEach((item, index) => {
    const trimmedPath = item.relativePath.trim();

    if (!trimmedPath.startsWith('./')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: referencedContentErrors.pathProtocol,
        path: ['referenced_content', index, 'relativePath'],
      });
    }

    if (trimmedPath.includes('../')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: referencedContentErrors.pathTraversal,
        path: ['referenced_content', index, 'relativePath'],
      });
    }

    if (item.name.trim().toLowerCase() === 'skill' && isRootRelativePath(item.relativePath)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: referencedContentErrors.reservedSkillName,
        path: ['referenced_content', index, 'name'],
      });
    }
  });

  const keyToIndices = new Map<string, number[]>();
  items.forEach((item, index) => {
    if (!canComputeReferencedContentUniquenessKey(item.relativePath)) {
      return;
    }
    const key = `${normalizeRelativePathSegments(item.relativePath)}/${item.name.trim()}`;
    const indices = keyToIndices.get(key) ?? [];
    indices.push(index);
    keyToIndices.set(key, indices);
  });

  for (const indices of keyToIndices.values()) {
    if (indices.length < 2) {
      continue;
    }
    for (const index of indices) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: referencedContentErrors.duplicatePath,
        path: ['referenced_content', index, 'name'],
      });
    }
  }
};

const toolIdsSchema = z
  .array(z.string().min(1, 'Tool ID must be non-empty'))
  .max(maxToolsPerSkill, `A skill can reference at most ${maxToolsPerSkill} tools`);

const skillCreateRequestObjectSchema = z.object({
  id: z
    .string()
    .min(1, 'ID must be non-empty')
    .max(skillIdMaxLength, `ID must be at most ${skillIdMaxLength} characters`)
    .regex(
      skillIdRegexp,
      'ID must start and end with a letter or number, and contain only lowercase letters, numbers, hyphens, and underscores'
    ),
  name: skillNameSchema,
  description: skillDescriptionSchema,
  content: skillContentSchema,
  referenced_content: z
    .array(referencedContentItemSchema)
    .max(
      maxReferencedContentItems,
      `A maximum of ${maxReferencedContentItems} additional files can be stored.`
    )
    .optional(),
  tool_ids: toolIdsSchema,
});

/**
 * Zod schema for validating skill create request bodies.
 */
export const skillCreateRequestSchema = skillCreateRequestObjectSchema.superRefine((data, ctx) => {
  if (data.referenced_content?.length) {
    superRefineReferencedContent(data.referenced_content, ctx);
  }
});

const skillUpdateRequestObjectSchema = z.object({
  name: skillNameSchema.optional(),
  description: skillDescriptionSchema.optional(),
  content: skillContentSchema.optional(),
  referenced_content: z
    .array(referencedContentItemSchema)
    .max(
      maxReferencedContentItems,
      `A maximum of ${maxReferencedContentItems} additional files can be stored.`
    )
    .optional(),
  tool_ids: toolIdsSchema.optional(),
});

/**
 * Zod schema for validating skill update request bodies.
 */
export const skillUpdateRequestSchema = skillUpdateRequestObjectSchema.superRefine((data, ctx) => {
  if (data.referenced_content?.length !== undefined) {
    superRefineReferencedContent(data.referenced_content, ctx);
  }
});

/**
 * Validates a skill ID has the right format.
 * Returns an error message if it fails, undefined otherwise.
 * @param skillId - Skill ID to validate
 */
export const validateSkillId = (skillId: string): string | undefined => {
  if (!skillIdRegexp.test(skillId)) {
    return 'Skill IDs must start and end with a letter or number, and can only contain lowercase letters, numbers, hyphens, and underscores';
  }
  if (skillId.length > skillIdMaxLength) {
    return `Skill IDs are limited to ${skillIdMaxLength} characters.`;
  }
};
