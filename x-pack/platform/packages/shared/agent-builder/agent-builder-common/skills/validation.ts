/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const skillIdMaxLength = 64;
export const skillIdRegexp = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

const skillNameSchema = z
  .string()
  .min(1, 'Name must be non-empty')
  .max(skillIdMaxLength, `Name must be at most ${skillIdMaxLength} characters`)
  .regex(
    skillIdRegexp,
    'Name must start and end with a letter or number, and contain only lowercase letters, numbers, hyphens, and underscores'
  );

const skillDescriptionSchema = z
  .string()
  .min(1, 'Description must be non-empty')
  .max(1024, 'Description must be at most 1024 characters');

const skillContentSchema = z.string().min(1, 'Content must be non-empty');

const referencedContentItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name must be non-empty')
    .max(64, 'Name must be at most 64 characters')
    .regex(
      /^[a-z0-9-_]+$/,
      'Reference name must contain only lowercase letters, numbers, underscores, and hyphens'
    ),
  relativePath: z
    .string()
    .min(1, 'Relative path must be non-empty')
    .regex(
      /^(?:\.|\.\/[a-z0-9-_]+)$/,
      'Relative path must start with a dot and contain only lowercase letters, numbers, underscores, and hyphens'
    ),
  content: z.string().min(1, 'Content must be non-empty'),
});

const toolIdsSchema = z.array(z.string().min(1, 'Tool ID must be non-empty'));

/**
 * Zod schema for validating skill create request bodies.
 */
export const skillCreateRequestSchema = z.object({
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
  referenced_content: z.array(referencedContentItemSchema).optional(),
  tool_ids: toolIdsSchema,
});

/**
 * Zod schema for validating skill update request bodies.
 */
export const skillUpdateRequestSchema = z.object({
  name: skillNameSchema.optional(),
  description: skillDescriptionSchema.optional(),
  content: skillContentSchema.optional(),
  referenced_content: z.array(referencedContentItemSchema).optional(),
  tool_ids: toolIdsSchema.optional(),
});

/**
 * Validates a skill ID has the right format.
 * Returns an error message if it fails, undefined otherwise.
 */
export const validateSkillId = (skillId: string): string | undefined => {
  if (!skillIdRegexp.test(skillId)) {
    return 'Skill IDs must start and end with a letter or number, and can only contain lowercase letters, numbers, hyphens, and underscores';
  }
  if (skillId.length > skillIdMaxLength) {
    return `Skill IDs are limited to ${skillIdMaxLength} characters.`;
  }
};
