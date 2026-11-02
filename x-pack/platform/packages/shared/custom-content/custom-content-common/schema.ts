/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from './constants';

/**
 * Persisted content of a custom content panel. No `prompt`: on an edit the prompt is a delta
 * ("remove the background color"), not a description, so the template is the source of truth.
 *
 * `esql_query` is an array so the persisted shape can grow to several queries per panel without a
 * migration, but is capped at one until the rest of the feature supports more. Read and write it
 * through {@link readEsqlQuery} / {@link toEsqlQueryState} rather than indexing directly, so
 * lifting the cap is a change in one place.
 */
export const customContentStateSchema = z.object({
  esql_query: z.array(z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)).max(1).optional(),
  template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH).optional(),
});

export type CustomContentState = z.output<typeof customContentStateSchema>;

/** The panel's single active ES|QL query, or `undefined` when it has none. */
export const readEsqlQuery = (state: Pick<CustomContentState, 'esql_query'>): string | undefined =>
  state.esql_query?.[0];

/** Builds the persisted `esql_query` field from a single query, omitting it when there is none. */
export const toEsqlQueryState = (esqlQuery: string | undefined): string[] | undefined =>
  esqlQuery === undefined ? undefined : [esqlQuery];

/**
 * Generation input for the create-panel and update-panel tools. `prompt` instructs this operation
 * only and is never persisted; the server generates `template`.
 */
const customContentUpdateFields = {
  prompt: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .optional()
    .describe(
      'Natural language instruction for what to create or change. The server generates the HTML template from this prompt.'
    ),
  esqlQuery: z
    .string()
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
    .nullable()
    .optional()
    .describe(
      'An ES|QL query the user supplied verbatim; it replaces the current one. Omit to keep the existing query. Pass null to remove it entirely. Do not write a query yourself: to change the data, set regenerateEsql to true and describe the change in "prompt". The server runs the query to sample its schema and rejects the whole operation if Elasticsearch refuses it.'
    ),
  regenerateEsql: lazySchema(() =>
    z
      .boolean()
      .optional()
      .describe(
        'Set true when the edit needs different data: a new measure or field ("also show the average bytes"), a new grouping or filter, or another time window. Without it the stored query is kept and the new data can never appear. The server regenerates the ES|QL query from "prompt", keeping the parts the request does not change. Omit for edits that only change the look: colors, sizes, wording, layout. Requires "prompt".'
      )
  ),
  index: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Exact index, alias, or data stream to generate the query from. Pass it with regenerateEsql whenever known.'
    ),
} as const;

const hasSomethingToChange = ({
  prompt,
  esqlQuery,
}: {
  prompt?: string;
  esqlQuery?: string | null;
}) => prompt !== undefined || esqlQuery === null || Boolean(esqlQuery?.trim());

const atLeastOneChange = { message: 'At least one of prompt or esqlQuery must be provided.' };

const regenerateNeedsPrompt = {
  message: 'regenerateEsql requires a prompt describing the change.',
};

const regenerateExcludesRemoval = {
  message: 'esqlQuery: null removes the query, so it cannot be combined with regenerateEsql.',
};

/**
 * Edit input for the chat tool. A conversation can hold one context attachment per panel, so the
 * target has to be explicit — without it the tool would act on whichever panel was attached first.
 */
export const customContentPanelUpdateSchema = z
  .object({
    embeddable_id: z
      .string()
      .min(1)
      .max(100)
      .describe(
        'The embeddable_id of the custom content panel to update, as shown in that panel\'s context header (e.g. "Custom content panel (embeddable_id: …)"). Always required — several panels can be attached to one conversation.'
      ),
    ...customContentUpdateFields,
  })
  .refine(hasSomethingToChange, atLeastOneChange)
  .refine(
    ({ prompt, regenerateEsql }) => !regenerateEsql || prompt !== undefined,
    regenerateNeedsPrompt
  )
  .refine(
    ({ esqlQuery, regenerateEsql }) => !(esqlQuery === null && regenerateEsql),
    regenerateExcludesRemoval
  );

export type CustomContentPanelUpdate = z.output<typeof customContentPanelUpdateSchema>;
