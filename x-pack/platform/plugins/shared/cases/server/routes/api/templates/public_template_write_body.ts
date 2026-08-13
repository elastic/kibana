/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { TemplateSchema } from '../../../../common/types/domain/template/v1';

/**
 * The public template write body (POST / PUT /api/cases/templates). Deliberately a strict,
 * caller-ownable subset of the internal `CreateTemplateInputSchema`/`UpdateTemplateInputSchema`:
 * server-managed attributes (`author`, `usageCount`, `fieldCount`, `fieldDefinitions`,
 * `lastUsedAt`, `isLatest`, `isDefault`, `legacyKey`) are not accepted — the internal service
 * computes or ignores them, but a public contract must not appear to accept inputs it discards.
 * Unknown keys are rejected so the accepted surface can grow without ambiguity.
 */
export const PublicTemplateWriteBodySchema = z.strictObject({
  /**
   * Template identity name (unique per owner, case-insensitive). Optional when the YAML
   * definition provides a case-default title (`name:`), which is then used as the identity name.
   */
  name: TemplateSchema.shape.name.optional(),
  owner: TemplateSchema.shape.owner,
  /** The template definition as a YAML string. */
  definition: TemplateSchema.shape.definition,
  description: TemplateSchema.shape.description,
  tags: TemplateSchema.shape.tags,
  /** Disabled templates are hidden from the case creation flow. Defaults to enabled. */
  isEnabled: TemplateSchema.shape.isEnabled,
});

export type PublicTemplateWriteBody = z.infer<typeof PublicTemplateWriteBodySchema>;
