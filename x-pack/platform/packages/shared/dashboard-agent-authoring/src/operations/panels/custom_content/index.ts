/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema, type AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import type { PanelResolutionRequestBase } from '../../../resolve_panel';
import { defineRequestPanelKind, panelDescriptionSchema, panelTitleSchema } from '../panel_kind';

/**
 * Custom content panel requests.
 *
 * Custom content is an HTML template generated server-side, so it is requested
 * like a Lens or Vega panel (`source: 'request'`, `renderer: 'custom_content'`).
 * The host provides the resolver that turns these requests into panel content.
 * The template is generated, but its panel `title` and `description` come from the request.
 */

/** Request to generate a new custom content panel's template. */
export interface CustomContentPanelAddRequest extends PanelResolutionRequestBase {
  renderer: 'custom_content';
  /** What to display. */
  nlQuery: string;
  /** ES|QL query feeding the template. Omit for static content. */
  esql?: string;
  /** Panel title. Omit for a panel without one. */
  title?: string;
  /** Panel description. Omit for a panel without one. */
  description?: string;
  existingPanel?: undefined;
}

/** Request to refine an existing custom content panel's template. */
export interface CustomContentPanelEditRequest extends PanelResolutionRequestBase {
  renderer: 'custom_content';
  existingPanel: AttachmentPanel;
  /** What to change. Omitted when the edit only changes the query or the display text. */
  nlQuery?: string;
  /** New ES|QL query. Omit to keep the existing query; pass `null` to remove it. */
  esql?: string | null;
  /** New panel title. Omit to keep the existing title; pass `null` to remove it. */
  title?: string | null;
  /** New panel description. Omit to keep the existing description; pass `null` to remove it. */
  description?: string | null;
}

/** Request to generate or refine a custom content panel's template; `existingPanel` tells them apart. */
export type CustomContentPanelResolutionRequest =
  | CustomContentPanelAddRequest
  | CustomContentPanelEditRequest;

/** Adds a new custom content panel. */
const customContentPanelRequestSchema = z.object({
  source: z.literal('request'),
  renderer: z
    .literal('custom_content')
    .describe(
      'Render an HTML/CSS layout generated server-side. A last resort for content Lens and Vega cannot express.'
    ),
  grid: panelGridSchema,
  query: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .describe(
      'Natural language description of what to display. The HTML template is generated server-side from it — do not supply markup yourself.'
    ),
  esql: z
    .string()
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
    .optional()
    .describe(
      'ES|QL query whose result rows feed the template. Omit for static content — it is not generated for you. Build it with the generate_esql tool rather than writing it yourself; the panel fails if Elasticsearch rejects it.'
    ),
  title: panelTitleSchema
    .optional()
    .describe('Panel title. The template has no heading of its own, so title the panel here.'),
  description: panelDescriptionSchema.optional().describe('Short panel description.'),
});

/** Edits an existing custom content panel by id. */
const customContentEditPanelRequestSchema = z
  .object({
    source: z.literal('request'),
    renderer: z
      .literal('custom_content')
      .describe('Required to edit a custom content panel; it is not inferred from the panel.'),
    panelId: z.string().max(256).describe('Existing custom content panel id to update.'),
    query: z
      .string()
      .min(1)
      .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
      .optional()
      .describe(
        'Natural language instruction for what to change. The server refines the existing template, preserving layout and design where possible.'
      ),
    esql: z
      .string()
      .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
      .nullable()
      .optional()
      .describe(
        'New ES|QL query. Omit to keep the existing query; pass null to remove it. Build it with the generate_esql tool rather than writing it yourself.'
      ),
    title: panelTitleSchema
      .nullable()
      .optional()
      .describe(
        'New panel title. Omit to keep the existing title; pass null to remove it. A title-only edit keeps the template as is.'
      ),
    description: panelDescriptionSchema
      .nullable()
      .optional()
      .describe(
        'New panel description. Omit to keep the existing description; pass null to remove it.'
      ),
  })
  .refine(
    ({ query, esql, title, description }) =>
      [query, esql, title, description].some((value) => value !== undefined),
    { message: 'At least one of query, esql, title, or description must be provided.' }
  );

export const customContentPanelKind = defineRequestPanelKind({
  renderer: 'custom_content',
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  label: 'custom content',
  addInputSchema: customContentPanelRequestSchema,
  editInputSchema: customContentEditPanelRequestSchema,
});
