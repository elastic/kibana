/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Template schema for case templates
 */
export const TemplateSchema = z.object({
  /**
   * Template identifier, can be shared across multiple SO's as we are storing all the changes made to the template
   */
  templateId: z.string(),

  /**
   * Display name
   */
  name: z.string(),

  /**
   * Owning Solution name
   */
  owner: z.string(),

  /**
   * Yaml definition for the template
   */
  definition: z.string(),

  /**
   * Template version
   */
  templateVersion: z.number(),

  /**
   * Deletion date, used to indicate soft-deletion. Elastic uses strings.
   */
  deletedAt: z.string().nullable(),
});

export type Template = z.infer<typeof TemplateSchema>;

/**
 * Parsed template field definition
 */
export const ParsedTemplateFieldSchema = z.object({
  control: z.string(),
  name: z.string(),
  label: z.string().optional(),
  type: z.literal('keyword'),
  metadata: z.record(z.unknown()),
});

/**
 * Parsed template definition
 */
export const ParsedTemplateDefinitionSchema = z.object({
  fields: z.array(ParsedTemplateFieldSchema),
});

/**
 * Parsed template schema with parsed definition
 */
export const ParsedTemplateSchema = TemplateSchema.omit({
  definition: true,
}).extend({
  /**
   * Parsed definition for the template. Needs to be validated programmatically.
   */
  definition: ParsedTemplateDefinitionSchema,
  isLatest: z.boolean(),
  latestVersion: z.number(),
});

export type ParsedTemplate = z.infer<typeof ParsedTemplateSchema>;

/**
 * Input for creating a new template
 */
export const CreateTemplateInputSchema = TemplateSchema.omit({
  templateId: true,
  templateVersion: true,
  deletedAt: true,
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;

/**
 * Input for updating an existing template (PUT - full replacement)
 */
export const UpdateTemplateInputSchema = TemplateSchema.omit({
  templateId: true,
  templateVersion: true,
  deletedAt: true,
});

export type UpdateTemplateInput = z.infer<typeof UpdateTemplateInputSchema>;

/**
 * Input for patching an existing template (PATCH - partial update)
 * All fields are optional to allow partial updates
 */
export const PatchTemplateInputSchema = TemplateSchema.omit({
  templateId: true,
  templateVersion: true,
  deletedAt: true,
}).partial();

export type PatchTemplateInput = z.infer<typeof PatchTemplateInputSchema>;
