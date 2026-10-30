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
  CUSTOM_CONTENT_MAX_ESQL_QUERIES,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from './constants';

/**
 * Persisted content of a custom content panel. No `prompt`: on an edit the prompt is a delta
 * ("remove the background color"), not a description, so the template is the source of truth.
 *
 * `esql_query` holds one or more queries. The first is the panel's main query and the template reads
 * it as `rows`; the template reads the n-th as `queries[n]`. Read and write it through
 * {@link readEsqlQuery} / {@link readAdditionalEsqlQueries} / {@link toEsqlQueryState} rather than
 * indexing directly. The flyout edits all of them; the agent tools still work with the first query
 * and leave the others as they are.
 */
export const customContentStateSchema = lazySchema(() =>
  z.object({
    esql_query: z
      .array(z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH))
      .max(CUSTOM_CONTENT_MAX_ESQL_QUERIES)
      .optional(),
    template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH).optional(),
  })
);

export type CustomContentState = z.output<typeof customContentStateSchema>;

/** The panel's main ES|QL query, or `undefined` when it has none. */
export const readEsqlQuery = (state: Pick<CustomContentState, 'esql_query'>): string | undefined =>
  state.esql_query?.[0];

/** The queries after the main one, which the template reads as `queries[1]`, `queries[2]`, ... */
export const readAdditionalEsqlQueries = (
  state: Pick<CustomContentState, 'esql_query'>
): string[] => state.esql_query?.slice(1) ?? [];

/**
 * Builds the persisted `esql_query` field from the main query and any additional ones, omitting it
 * when there is no main query: additional queries are meaningless without it.
 */
export const toEsqlQueryState = (
  esqlQuery: string | undefined,
  additionalEsqlQueries: readonly string[] = []
): string[] | undefined =>
  esqlQuery === undefined ? undefined : [esqlQuery, ...additionalEsqlQueries];

/**
 * A panel's queries as an agent asks for them, by position. Shared by the chat tool and the
 * dashboard generation tool, so both describe the same thing to the model.
 */
export const customContentDatasetsSchema = lazySchema(() =>
  z
    .array(
      z.object({
        description: z
          .string()
          .min(1)
          .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
          .optional()
          .describe(
            'What this query returns, in words: the data, not the layout (for example "total requests and the number of 5xx errors, as one row" or "the five hosts with the most requests"). The server generates the ES|QL query from it; do not write one yourself. On an existing panel this regenerates the query at this position, keeping what the description does not change.'
          ),
        esql: z
          .string()
          .min(1)
          .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
          .optional()
          .describe(
            'An ES|QL query the user supplied verbatim for this position. It wins over "description" and, on an existing panel, replaces the query at this position.'
          ),
        index: z
          .string()
          .max(256)
          .optional()
          .describe(
            'Exact index, alias, or data stream this query reads from. Pass it with "description" whenever known.'
          ),
      })
    )
    .min(1)
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERIES)
    .describe(
      `The panel's ES|QL queries, by position, for a panel that needs data of more than one shape, such as headline numbers plus a ranked list. The template reads the first as \`rows\` and the n-th as \`queries[n].rows\`, so the order matters. Each entry describes one query ("description"), or supplies one verbatim ("esql"). With a single query use the single-query fields instead. Do not combine with the single-query fields. On an existing panel: an entry with "description" regenerates the query at that position, one with "esql" replaces it, an empty entry {} keeps it, an entry past the current queries adds one, and queries not listed are kept. Queries cannot be removed this way. At most ${CUSTOM_CONTENT_MAX_ESQL_QUERIES}.`
    )
);

/**
 * Generation input for the create-panel and update-panel tools. `prompt` instructs this operation
 * only and is never persisted; the server generates `template`.
 */
const createUpdateFields = () => ({
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
  regenerateEsql: z
    .boolean()
    .optional()
    .describe(
      'Set true when the edit changes what the panel shows: the server regenerates the ES|QL query from "prompt", keeping the parts the request does not change. Omit for layout, copy and style edits, which keep the current query. Requires "prompt".'
    ),
  index: z
    .string()
    .max(256)
    .optional()
    .describe(
      'Exact index, alias, or data stream to generate the query from. Pass it with regenerateEsql whenever known.'
    ),
  datasets: customContentDatasetsSchema.optional(),
});

const hasSomethingToChange = ({
  prompt,
  esqlQuery,
  datasets,
}: {
  prompt?: string;
  esqlQuery?: string | null;
  datasets?: unknown[];
}) => prompt !== undefined || esqlQuery === null || Boolean(esqlQuery?.trim()) || Boolean(datasets);

const atLeastOneChange = {
  message: 'At least one of prompt, esqlQuery or datasets must be provided.',
};

const datasetsReplaceSingleQueryFields = {
  message:
    "datasets replaces esqlQuery, regenerateEsql and index: put each query's esql and index on its dataset.",
};

const datasetDescriptionsNeedPrompt = {
  message:
    'A dataset with a description changes what the panel shows, so it needs a prompt describing the change.',
};

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
export const customContentPanelUpdateSchema = lazySchema(() =>
  z
    .object({
      embeddable_id: z
        .string()
        .min(1)
        .max(100)
        .describe(
          'The embeddable_id of the custom content panel to update, as shown in that panel\'s context header (e.g. "Custom content panel (embeddable_id: …)"). Always required — several panels can be attached to one conversation.'
        ),
      ...createUpdateFields(),
    })
    .refine(hasSomethingToChange, atLeastOneChange)
    .refine(
      ({ prompt, regenerateEsql }) => !regenerateEsql || prompt !== undefined,
      regenerateNeedsPrompt
    )
    .refine(
      ({ esqlQuery, regenerateEsql }) => !(esqlQuery === null && regenerateEsql),
      regenerateExcludesRemoval
    )
    .refine(
      ({ datasets, esqlQuery, regenerateEsql, index }) =>
        !datasets || (esqlQuery === undefined && !regenerateEsql && index === undefined),
      datasetsReplaceSingleQueryFields
    )
    .refine(
      ({ datasets, prompt }) =>
        prompt !== undefined || !datasets?.some(({ description }) => description !== undefined),
      datasetDescriptionsNeedPrompt
    )
);

export type CustomContentPanelUpdate = z.output<typeof customContentPanelUpdateSchema>;
