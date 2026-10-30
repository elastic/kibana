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
import { z, lazySchema } from '@kbn/zod/v4';
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
  /** ES|QL query feeding the template. Wins over `hasData`. */
  esql?: string;
  /** True: generate the query from `nlQuery`. False: static content with no query. Always stated. */
  hasData: boolean;
  /** Index, alias or data stream to generate the query from. */
  index?: string;
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
  /** True: ensure the panel has data, generating a query only when it has none. False: remove it. */
  hasData?: boolean;
  /** Regenerate the query from `nlQuery`, keeping the parts the request does not change. */
  regenerateESQL?: boolean;
  /** Index, alias or data stream to generate the query from. */
  index?: string;
}

/** Request to generate or refine a custom content panel's template; `existingPanel` tells them apart. */
export type CustomContentPanelResolutionRequest =
  | CustomContentPanelAddRequest
  | CustomContentPanelEditRequest;

/** Creates or edits a custom content panel. */
const customContentPanelContentSchema = lazySchema(() =>
  z.object({
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
        'An ES|QL query the user supplied verbatim; it wins over hasData and, on an existing panel, replaces the current one (omit to keep it, pass null to remove it). Do not write a query yourself; set hasData to true and let the server generate it.'
      ),
    hasData: z
      .boolean()
      .optional()
      .describe(
        'Required for a new panel: true when it shows live Elasticsearch values, so the server generates the ES|QL query from "query" (and "index"); false for static content such as a banner, a legend or a note, which has no query. Always state which one it is. On an existing panel: true ensures it has data, generating a query from "query" only when it has none; false removes the query so the panel is static; omit to keep the current data state.'
      ),
    regenerateESQL: z
      .boolean()
      .optional()
      .describe(
        'Existing panel only. Set true when the edit needs different data: a new measure or field ("also show the average bytes"), a new grouping or filter, or another time window. Without it the stored query is kept and the new data can never appear. The server regenerates the ES|QL query from "query", keeping the parts the request does not change. Omit for edits that only change the look: colors, sizes, wording, layout. Requires "query".'
      ),
    index: z
      .string()
      .max(256)
      .optional()
      .describe(
        'Exact index, alias, or data stream the data comes from. Pass it whenever known, together with hasData: true; on an existing panel, when regenerating or adding data.'
      ),
  })
);

export const customContentPanelKind = defineRequestPanelKind({
  renderer: 'custom_content',
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  label: 'custom content',
  contentSchema: customContentPanelContentSchema,
});
