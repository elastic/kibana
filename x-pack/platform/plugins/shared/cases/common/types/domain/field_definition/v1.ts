/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const FieldDefinitionSchema = z.object({
  /**
   * Unique identifier for the field definition
   */
  fieldDefinitionId: z.string(),

  /**
   * The field name — matches the `name` property inside the YAML definition.
   * Must be unique per owner.
   */
  name: z.string(),

  /**
   * YAML string of a single FieldSchema entry (the full field definition)
   */
  definition: z.string(),

  /**
   * Owning solution
   */
  owner: z.string(),

  /**
   * Optional human-readable description of the field's purpose
   */
  description: z.string().optional(),

  /**
   * When true, this field is rendered in every case regardless of which template
   * (if any) the case uses. Values are stored in extended_fields alongside
   * template-specific fields.
   */
  isGlobal: z.boolean().optional(),

  /**
   * Server-managed link to the v1 custom-field configuration key this definition
   * was migrated/mirrored from. Only migration and link-repair code may set it;
   * it is never accepted from API input (see the create/update input schemas) and
   * is preserved verbatim through ordinary metadata updates. While the matching
   * v1 field remains configured for the owner/space, values are kept in sync
   * between `customFields` (keyed by `legacyKey`) and `extended_fields` (keyed by
   * this definition's name/type).
   */
  legacyKey: z.string().optional(),
});

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// `fieldDefinitionId` is server-generated and `legacyKey` is server-managed —
// ordinary create/update callers can never set, change, or clear them (Zod
// strips unknown keys on parse, so a submitted value is silently dropped).
export const CreateFieldDefinitionInputSchema = FieldDefinitionSchema.omit({
  fieldDefinitionId: true,
  legacyKey: true,
});

export type CreateFieldDefinitionInput = z.infer<typeof CreateFieldDefinitionInputSchema>;

export const UpdateFieldDefinitionInputSchema = FieldDefinitionSchema.omit({
  fieldDefinitionId: true,
  legacyKey: true,
});

export type UpdateFieldDefinitionInput = z.infer<typeof UpdateFieldDefinitionInputSchema>;
