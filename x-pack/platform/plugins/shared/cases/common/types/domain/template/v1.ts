/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_TAG_LENGTH,
  MAX_TAGS_PER_TEMPLATE,
  MAX_TITLE_LENGTH,
} from '../../../constants';
import { FieldSchema, isRefField } from './fields';
import { CaseConnectorWithoutNameSchema } from '../../domain_zod/connector/v1';
import { CaseAssigneesSchema } from '../../domain_zod/user/v1';

/** Template tag: non-empty and length-bounded, mirroring the client-side metadata validation. */
const TemplateTagSchema = z.string().min(1).max(MAX_TEMPLATE_TAG_LENGTH);

/** Default case settings a template applies when creating a case; both optional and independent. */
export const TemplateSettingsSchema = z.object({
  syncAlerts: z.boolean().optional(),
  extractObservables: z.boolean().optional(),
});

export type TemplateSettings = z.infer<typeof TemplateSettingsSchema>;

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
  name: z.string().min(1).max(MAX_TEMPLATE_NAME_LENGTH),

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
   * Deletion date, used to indicate soft-deletion. Elastic uses strings, but will narrow it some more to actual dates here.
   */
  deletedAt: z.string().datetime().nullable(),

  /**
   * Template description
   */
  description: z.string().max(MAX_TEMPLATE_DESCRIPTION_LENGTH).optional(),

  /**
   * Tags for categorization
   */
  tags: z.array(TemplateTagSchema).max(MAX_TAGS_PER_TEMPLATE).optional(),

  /**
   * Template author
   */
  author: z.string().optional(),

  /**
   * Number of times this template has been used
   */
  usageCount: z.number().optional(),

  /**
   * Number of fields in the template
   */
  fieldCount: z.number().optional(),

  /**
   * Array of field metadata used for tooltips and label-to-storage-key resolution at search time
   */
  fieldDefinitions: z
    .array(
      z.object({
        name: z.string(),
        label: z.string(),
        type: z.string(),
        control: z.string(),
      })
    )
    .optional(),

  /**
   * Last time this template was used
   */
  lastUsedAt: z.string().datetime().optional(),

  /**
   * Whether this is the default template
   */
  isDefault: z.boolean().optional(),

  /**
   * Whether this is the latest version for a templateId
   */
  isLatest: z.boolean().optional(),
  /**
   * Whether this template is enabled. Disabled templates are not shown in the case creation flow.
   */
  isEnabled: z.boolean().optional(),
});

export type Template = z.infer<typeof TemplateSchema>;

/**
 * Parsed template definition
 */
export const ParsedTemplateDefinitionSchema = z.object({
  /**
   * Top-level case defaults applied when creating a case from this template.
   *
   * Template identity (name/description/tags) is intentionally NOT part of the definition — it lives
   * on the template saved object attributes and is edited in the render panel's "Template details"
   * section, never in the YAML. See template_form_layout / TemplateMetadataForm.
   *
   * `name` is the default case title and is the single field for it (legacy top-level `title` is
   * canonicalized to `name` before validation — see normalize_template_case_defaults). It requires a
   * value; the remaining case defaults are optional (an empty/`null` value parses to `undefined`).
   */
  name: z.string().min(1).max(MAX_TITLE_LENGTH),
  // Case defaults are forced-present in the editor YAML so authors always see every field the
  // template can set on a case, but their values are optional. `null` (an empty YAML value) means
  // "no default" and stays behaviorally identical to an omitted key on the connector path, which
  // merges with `??` / truthy checks.
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
  category: z.string().nullable().optional(),
  assignees: CaseAssigneesSchema.optional(),
  /**
   * Default connector pre-selected when creating a case from this template (`name` resolved from
   * `id` at create time). A first-class case concept, separate from the `fields` system.
   */
  connector: CaseConnectorWithoutNameSchema.optional(),
  /** Default case settings (syncAlerts / extractObservables) applied when creating a case. */
  settings: TemplateSettingsSchema.optional(),
  fields: z.array(FieldSchema).refine(
    (fields) => {
      const fieldNames = new Set(
        fields.map((field) => (isRefField(field) ? field.name ?? field.$ref : field.name))
      );
      return fieldNames.size === fields.length;
    },
    { message: 'Field names must be unique.' }
  ),
});

export type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

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
  /**
   * Original YAML definition string with preserved formatting and comments.
   * This should be used when editing templates to preserve user formatting.
   */
  definitionString: z.string(),
  isLatest: z.boolean(),
  latestVersion: z.number(),
});

export type ParsedTemplate = z.infer<typeof ParsedTemplateSchema>;

/**
 * Input for creating a new template.
 *
 * `name` is the template identity and is optional on the wire: the route derives it from the
 * definition's case-default title when a caller omits it (API back-compat — the editor UI always
 * sends the identity name explicitly). The stored template `name` (TemplateSchema) is always
 * present.
 */
export const CreateTemplateInputSchema = TemplateSchema.omit({
  templateId: true,
  templateVersion: true,
  deletedAt: true,
}).partial({ name: true });

export type CreateTemplateInput = z.infer<typeof CreateTemplateInputSchema>;

/**
 * Input for updating an existing template (PUT - full replacement). `name` is optional for the same
 * reason as CreateTemplateInputSchema.
 */
export const UpdateTemplateInputSchema = TemplateSchema.omit({
  templateId: true,
  templateVersion: true,
  deletedAt: true,
}).partial({ name: true });

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
