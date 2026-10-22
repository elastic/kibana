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

/** Adds a new custom content panel. */
const customContentPanelRequestSchema = z.object({
  source: z.literal('request'),
  renderer: z
    .literal('custom_content')
    .describe(
      'Render an HTML/CSS layout generated server-side. A last resort for content Lens and Vega cannot express.'
    ),
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
      'An ES|QL query the user supplied verbatim. It wins over hasData. Do not write a query yourself; set hasData to true and let the server generate it.'
    ),
  hasData: z
    .boolean()
    .describe(
      'Required. True when the panel shows live Elasticsearch values: the server generates the ES|QL query from "query" (and "index"). False for static content such as a banner, a legend or a note, which has no query. Always state which one it is.'
    ),
  index: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Exact index, alias, or data stream the data comes from. Pass it whenever known, together with hasData: true.'
    ),
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
        'An ES|QL query the user supplied verbatim; it replaces the current one. Omit to keep the current query; pass null to remove it. Do not write a query yourself; to change the data, set regenerateESQL to true and describe the change in "query".'
      ),
    regenerateESQL: z
      .boolean()
      .optional()
      .describe(
        'Set true when the edit changes what the panel shows: the server regenerates the ES|QL query from "query", keeping the parts the request does not change. Omit for layout, copy and style edits, which keep the current query. Requires "query".'
      ),
    hasData: z
      .boolean()
      .optional()
      .describe(
        'True: ensure the panel has data, generating a query from "query" only when it has none. False: remove the query so the panel is static. Omit to keep the current data state.'
      ),
    index: z
      .string()
      .max(256)
      .optional()
      .describe(
        'Exact index, alias, or data stream to generate the query from, when regenerating or adding data.'
      ),
  })
  .refine(({ regenerateESQL, hasData }) => !(regenerateESQL && hasData === false), {
    message: 'regenerateESQL cannot be combined with hasData: false, which removes the query.',
  })
  .refine(
    ({ query, esql, regenerateESQL, hasData }) =>
      query !== undefined ||
      ((esql !== undefined || hasData === false) && !regenerateESQL && hasData !== true),
    {
      message:
        'query is required unless the edit only replaces or removes the ES|QL query (esql, or hasData: false); regenerateESQL and hasData: true need it.',
    }
  );

export const customContentPanelKind = defineRequestPanelKind({
  renderer: 'custom_content',
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  label: 'custom content',
  addInputSchema: customContentPanelRequestSchema,
  editInputSchema: customContentEditPanelRequestSchema,
});
