/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import {
  CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
} from '@kbn/custom-content-common';
import { z } from '@kbn/zod/v4';
import type { PanelResolutionRequestBase } from '../../resolve_panel';
import { defineRequestPanelKind } from '../panel_kind';

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

/** Creates or edits a custom content panel. */
const customContentPanelContentSchema = z.object({
  source: z.literal('request'),
  renderer: z
    .literal('custom_content')
    .describe(
      'Render an HTML/CSS layout generated server-side. A last resort for content Lens and Vega cannot express. Required to edit a custom content panel; it is not inferred from the panel.'
    ),
  query: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .optional()
    .describe(
      'Natural language description of what to display. The HTML template is generated server-side from it — do not supply markup yourself. Required for new panels; on an existing panel, what to change, preserving layout and design where possible.'
    ),
  esql: z
    .string()
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
    .nullable()
    .optional()
    .describe(
      'ES|QL query whose result rows feed the template. Omit for static content — it is not generated for you. Build it with the generate_esql tool rather than writing it yourself; the panel fails if Elasticsearch rejects it. On an existing panel: omit to keep the existing query; pass null to remove it.'
    ),
});

export const customContentPanelKind = defineRequestPanelKind({
  renderer: 'custom_content',
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  label: 'custom content',
  contentSchema: customContentPanelContentSchema,
});
