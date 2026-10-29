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
        'An HTML/CSS layout generated server-side. Required to edit a custom content panel; it is not inferred from the panel.'
      ),
    query: z
      .string()
      .min(1)
      .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
      .optional()
      .describe(
        'What to display, in plain words; the HTML template is generated from it, so do not write markup. Required for a new panel. On an existing panel, what to change (layout and design are kept where possible); omit it only when the edit just replaces or removes the ES|QL query.'
      ),
    esql: z
      .string()
      .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
      .nullable()
      .optional()
      .describe(
        'An ES|QL query the user supplied verbatim; it is used as is and wins over hasData. On an existing panel it replaces the current query: omit it to keep the query, or pass null to remove it. Never write one yourself: set hasData to true and let the server generate it.'
      ),
    hasData: z
      .boolean()
      .optional()
      .describe(
        'Required for a new panel: true when it shows live Elasticsearch values, so the server generates the ES|QL query from `query` (and `index`); false for static content such as a banner, a legend or a note, which has no query. Always state which one it is. On an existing panel: true ensures it has a query, generating one from `query` only when it has none; false removes the query so the panel is static; omit it to keep the current state.'
      ),
    regenerateESQL: z
      .boolean()
      .optional()
      .describe(
        'Existing panels only. Set true when the edit changes what the panel shows: the server regenerates the ES|QL query from `query`, keeping the parts the request does not change. Omit it for layout, copy and style edits, which keep the current query. Requires `query`; cannot be combined with hasData false.'
      ),
    index: z
      .string()
      .max(256)
      .optional()
      .describe(
        'Index, alias, data stream, or pattern the data comes from. Pass it whenever known, with hasData true or on an edit that regenerates or adds the query.'
      ),
  })
);

export const customContentPanelKind = defineRequestPanelKind({
  renderer: 'custom_content',
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  label: 'custom content',
  contentSchema: customContentPanelContentSchema,
});
