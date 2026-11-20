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
  REMOVE_ALL_QUERIES_DESCRIPTION,
  rejectRemovedQueryFields,
  customContentDataQueriesSchema,
  type CustomContentQueryChanges,
} from '@kbn/custom-content-common';
import { z, lazySchema } from '@kbn/zod/v4';
import type { PanelResolutionRequestBase } from '../../resolve_panel';
import { defineRequestPanelKind } from '../panel_kind';

/**
 * Custom content panel requests.
 *
 * Custom content is an HTML template generated server-side, so it is requested
 * like a Lens or Vega panel (`type: 'custom_content'`).
 * The host provides the resolver that turns these requests into panel content.
 */

/**
 * Request to generate a new custom content panel's template. What the queries should become is said
 * the one way the builder is told: `dataQueries`, or `removeAllQueries` for static content.
 */
export interface CustomContentPanelAddRequest
  extends PanelResolutionRequestBase,
    CustomContentQueryChanges {
  type: 'custom_content';
  /** What to display. */
  nlQuery: string;
  existingPanel?: undefined;
}

/** Request to refine an existing custom content panel's template. */
export interface CustomContentPanelEditRequest
  extends PanelResolutionRequestBase,
    CustomContentQueryChanges {
  type: 'custom_content';
  existingPanel: AttachmentPanel;
  /** What to change. Omitted when the edit only changes the query. */
  nlQuery?: string;
}

/** Request to generate or refine a custom content panel's template; `existingPanel` tells them apart. */
export type CustomContentPanelResolutionRequest =
  | CustomContentPanelAddRequest
  | CustomContentPanelEditRequest;

/** Creates or edits a custom content panel. */
const customContentPanelContentSchema = lazySchema(() =>
  z
    .looseObject({
      type: z
        .literal('custom_content')
        .describe(
          'An HTML/CSS layout generated server-side. A last resort for content Lens and Vega cannot express.'
        ),
      query: z
        .string()
        .min(1)
        .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
        .optional()
        .describe(
          'Natural language description of what to display. The HTML template is generated server-side from it — do not supply markup yourself. Required for new panels; on an existing panel, what to change, preserving layout and design where possible. On an edit, omit it only when the edit just replaces queries with ES|QL the user supplied or removes them.'
        ),
      dataQueries: customContentDataQueriesSchema
        .optional()
        .describe(
          'The panel\'s queries by position, for a panel that shows live data: one entry per query. A new panel needs this or removeAllQueries. "query" says how the panel looks and how it uses each query; each data query says what one query returns. On an edit, list only the queries you change; a description needs "query" saying how the panel should now use the data. Always set "index" on an entry when known.'
        ),
      removeAllQueries: z
        .boolean()
        .optional()
        .describe(
          `${REMOVE_ALL_QUERIES_DESCRIPTION} A new panel needs this (a banner, a legend, a note) or dataQueries; always state which.`
        ),
    })
    .superRefine(rejectRemovedQueryFields(['esql', 'hasData', 'regenerateESQL', 'index']))
);

const customContentGuidance = `A custom content panel with live data does not need a query from you. When you create one, always say which kind it is, since there is no default: \`dataQueries\` for live data, or \`removeAllQueries: true\` for static content with no data. \`dataQueries\` lists the panel's queries by position, one entry per query, and the server generates each query from its \`description\` and samples its schema before generating the template. Set \`index\` on an entry when you know it. \`removeAllQueries: true\` makes a static panel — use that for banners, legends and notes, and never invent a query for them. Do not write a query yourself; give \`esql\` on an entry only when the user supplied one to use as it is. If the server cannot generate a query, the panel fails with an error naming the reason — fix the \`index\` or the description and retry rather than proceeding.

To create one, set \`query\` to a concise description of what to display; the HTML template is generated server-side from it.

To edit one, list its id in \`panels\` with \`type: "custom_content"\`. Set \`query\` to the requested change; layout, copy and style edits (colors, sizes, wording) keep the current queries, so send no \`dataQueries\`. An edit that needs different data, such as "also show the average bytes", a new grouping or filter, or another time window, also needs \`dataQueries\` with an entry at the position of the query to change: without it the stored query is kept and the new data can never appear. The server then regenerates that query from the \`description\`, keeping what the request does not change. \`removeAllQueries: true\` removes every query. The server refines the existing template.

### Panels with several queries

When one panel needs data of more than one shape — headline numbers above a ranked list, say — send one \`dataQueries\` entry per query. The template reads the first as \`rows\` and the n-th as \`queries[n].rows\`. Each entry says what ONE query returns, not how it looks: \`{ description: "total requests and the number of 5xx errors, as one row", index: "logs-*" }\`, then \`{ description: "the five hosts with the most requests" }\`. \`query\` stays the layout and how each query is used. Keep a panel to a few queries (at most ten).

To edit a panel that has several queries, send \`dataQueries\` only for the ones you change, in position order: an entry with \`description\` regenerates that query, \`esql\` replaces it, \`{}\` keeps it, and an entry past the current queries adds one. Queries you do not list are kept. They cannot be removed one at a time with this tool, and the panel's editor only lets the user remove the last query. To drop an earlier one, replace it with a different query (a new \`description\` or \`esql\`), or use \`removeAllQueries: true\` to remove them all. For a layout or style edit omit \`dataQueries\`: every query is kept.`;

export const customContentPanelKind = defineRequestPanelKind({
  type: 'custom_content',
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  label: 'custom content',
  selection: {
    priority: 4,
    whenToUse:
      'a last resort for HTML/CSS layouts that Lens and Vega cannot express, such as KPI scorecards with colored status badges, health/status boards, or narrative text mixed with live data values, or when the user asks for a custom/HTML panel.',
  },
  guidance: customContentGuidance,
  contentSchema: customContentPanelContentSchema,
});
