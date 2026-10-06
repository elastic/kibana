/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { panelGridSchema, type AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import type { PanelResolutionRequestBase } from '../../../resolve_panel';

/**
 * Custom content panel requests.
 *
 * Custom content is an HTML template generated server-side, so it is requested
 * like a Lens or Vega panel (`source: 'request'`, `renderer: 'custom_content'`).
 * The host provides the resolver that turns these requests into panel content.
 */

/** Request to generate a new custom content panel's template. */
export interface CustomContentPanelAddRequest extends PanelResolutionRequestBase {
  renderer: 'custom_content';
  /** What to display. */
  nlQuery: string;
  /** ES|QL query feeding the template. Omit for static content. */
  esql?: string;
  existingPanel?: undefined;
}

/** Request to refine an existing custom content panel's template. */
export interface CustomContentPanelEditRequest extends PanelResolutionRequestBase {
  renderer: 'custom_content';
  existingPanel: AttachmentPanel;
  /** What to change. Omitted when the edit only changes the query. */
  nlQuery?: string;
  /** New ES|QL query. Omit to keep the existing query; pass `null` to remove it. */
  esql?: string | null;
}

/** Request to generate or refine a custom content panel's template; `existingPanel` tells them apart. */
export type CustomContentPanelResolutionRequest =
  | CustomContentPanelAddRequest
  | CustomContentPanelEditRequest;

/** Adds a new custom content panel. */
export const customContentPanelRequestSchema = z.object({
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
});

/** Edits an existing custom content panel by id. */
export const customContentEditPanelRequestSchema = z
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
  })
  .refine(({ query, esql }) => query !== undefined || esql !== undefined, {
    message: 'At least one of query or esql must be provided.',
  });
