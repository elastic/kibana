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
 * like a Lens or Vega panel (`source: 'request'`, `renderer: 'custom_content'`).
 * The host provides the resolver that turns these requests into panel content.
 */

/**
 * Request to generate a new custom content panel's template. What the queries should become is said
 * the one way the builder is told: `dataQueries`, or `removeAllQueries` for static content.
 */
export interface CustomContentPanelAddRequest
  extends PanelResolutionRequestBase,
    CustomContentQueryChanges {
  renderer: 'custom_content';
  /** What to display. */
  nlQuery: string;
  existingPanel?: undefined;
}

/** Request to refine an existing custom content panel's template. */
export interface CustomContentPanelEditRequest
  extends PanelResolutionRequestBase,
    CustomContentQueryChanges {
  renderer: 'custom_content';
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

export const customContentPanelKind = defineRequestPanelKind({
  renderer: 'custom_content',
  embeddableType: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  label: 'custom content',
  contentSchema: customContentPanelContentSchema,
});
