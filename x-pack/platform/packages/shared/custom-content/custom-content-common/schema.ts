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
import {
  ESQL_QUERIES_TOTAL_LENGTH_MESSAGE,
  fitsEsqlQueriesTotalLength,
} from './esql_queries_total_length';

/**
 * Persisted content of a custom content panel. No `prompt`: on an edit the prompt is a delta
 * ("remove the background color"), not a description, so the template is the source of truth.
 *
 * `esql_query` holds one or more queries, in the order the template reads them: the first is its
 * `rows`, the n-th is `queries[n]`. The editor does not change the others yet, and neither do the
 * agent tools; they are kept as they are.
 */
export const customContentStateSchema = lazySchema(() =>
  z.object({
    esql_query: z
      .array(z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH))
      .max(CUSTOM_CONTENT_MAX_ESQL_QUERIES)
      .refine(fitsEsqlQueriesTotalLength, { message: ESQL_QUERIES_TOTAL_LENGTH_MESSAGE })
      .optional(),
    template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH).optional(),
  })
);

export type CustomContentState = z.output<typeof customContentStateSchema>;

const isNotBlank = (value: string) => value.trim().length > 0;
const BLANK_MESSAGE = 'Must not be blank. Leave it out to keep the query at this position.';

/**
 * A panel's queries as an agent asks for them, by position. Shared by the chat tool, the
 * dashboard generation tool and `create_visualization`, so all describe the same thing to the model.
 */
export const customContentDataQueriesSchema = lazySchema(() =>
  z
    .array(
      z
        .object({
          description: z
            .string()
            .min(1)
            .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
            .refine(isNotBlank, { message: BLANK_MESSAGE })
            .optional()
            .describe(
              'What this query returns, in words: the data, not the layout (for example "total requests and the number of 5xx errors, as one row" or "the five hosts with the most requests"). The server generates the ES|QL query from it; do not write one yourself. On an existing panel this regenerates the query at this position, keeping what the description does not change.'
            ),
          esql: z
            .string()
            .min(1)
            .max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH)
            .refine(isNotBlank, { message: BLANK_MESSAGE })
            .optional()
            .describe(
              'An ES|QL query the user supplied for this position, to use as it is. It wins over "description" and, on an existing panel, replaces the query at this position.'
            ),
          index: z
            .string()
            .max(256)
            .optional()
            .describe(
              'Exact index, alias, or data stream this query reads from. Pass it with "description" whenever known.'
            ),
        })
        .refine(({ index, description }) => index === undefined || description !== undefined, {
          message:
            'An "index" only applies to an entry with a "description", which is generated from it. Put the "description" on the entry, or drop the "index".',
        })
    )
    .min(1)
    .max(CUSTOM_CONTENT_MAX_ESQL_QUERIES)
    .describe(
      `The panel's ES|QL queries, by position: one entry for a panel with one query, several for a panel that needs data of more than one shape, such as headline numbers plus a ranked list. The template reads the first as \`rows\` and the n-th as \`queries[n].rows\`, so the order matters. Each entry describes one query ("description"), or gives one ready to use ("esql"). On an existing panel: an entry with "description" regenerates the query at that position, one with "esql" replaces it, an empty entry {} keeps it, an entry past the current queries adds one, and queries not listed are kept. Queries cannot be removed this way. At most ${CUSTOM_CONTENT_MAX_ESQL_QUERIES}.`
    )
);

export type CustomContentDataQueries = z.output<typeof customContentDataQueriesSchema>;
/** What a request does to the queries of a panel; one that says nothing leaves them as they are. */
export interface CustomContentQueryChanges {
  /** What each position should become; positions it does not reach are kept. */
  dataQueries?: CustomContentDataQueries;
  /** Remove every query, which leaves a panel with static content. Cannot be combined with `dataQueries`. */
  removeAllQueries?: boolean;
}
/** One of a panel's queries, as an agent asks for it. */
export type CustomContentDataQuery = CustomContentDataQueries[number];

/**
 * Rejects the single-query fields that `dataQueries` and `removeAllQueries` replaced. The tool
 * schemas drop unknown keys, so without this a model that still sends one would see its call
 * succeed with the field ignored: a supplied query would be lost, and a data change would never
 * happen. A leftover that says nothing (`undefined` or an empty string) is let through, and so
 * is `null` when `ignoreNull` is set: it means "omitted" where the tool never used it to remove a
 * query. Use it on a loose object, which keeps the keys to look at.
 */
export const rejectRemovedQueryFields =
  (removed: readonly string[], { ignoreNull = false }: { ignoreNull?: boolean } = {}) =>
  (value: Record<string, unknown>, ctx: z.RefinementCtx): void => {
    removed
      .filter((name) => value[name] !== undefined && value[name] !== '')
      .filter((name) => !(ignoreNull && value[name] === null))
      .forEach((name) => {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: `"${name}" is no longer accepted: describe the panel's queries in "dataQueries" (one entry per query, by position), or pass "removeAllQueries": true for a panel with no data.`,
        });
      });
  };

/** Says that a panel shows static content, which is what leaves it with no queries. */
export const REMOVE_ALL_QUERIES_DESCRIPTION =
  'true: the panel shows static content with no data, so it has no queries. Never use it to get past a failed query generation: fix the index or the description and retry instead.';

/**
 * Generation input for the update-panel tool. `prompt` instructs this operation only and is never
 * persisted; the server generates `template`.
 */
const updateFields = () => ({
  prompt: z
    .string()
    .min(1)
    .max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH)
    .optional()
    .describe(
      'Natural language instruction for what to create or change. The server generates the HTML template from this prompt.'
    ),
  dataQueries: customContentDataQueriesSchema.optional(),
  removeAllQueries: z.boolean().optional().describe(REMOVE_ALL_QUERIES_DESCRIPTION),
});

const hasSomethingToChange = ({
  prompt,
  dataQueries,
  removeAllQueries,
}: {
  prompt?: string;
  dataQueries?: unknown[];
  removeAllQueries?: boolean;
}) => prompt !== undefined || Boolean(dataQueries) || Boolean(removeAllQueries);

const atLeastOneChange = {
  message: 'At least one of prompt, dataQueries or removeAllQueries must be provided.',
};

const dataQueryDescriptionsNeedPrompt = {
  message:
    'A data query with a description changes what the panel shows, so it needs a prompt describing the change.',
};

const removeAllExcludesDataQueries = {
  message: 'removeAllQueries removes every query, so it cannot be combined with dataQueries.',
};

/**
 * Edit input for the chat tool. A conversation can hold one context attachment per panel, so the
 * target has to be explicit — without it the tool would act on whichever panel was attached first.
 */
export const customContentPanelUpdateSchema = lazySchema(() =>
  z
    .looseObject({
      embeddable_id: z
        .string()
        .min(1)
        .max(100)
        .describe(
          'The embeddable_id of the custom content panel to update, as shown in that panel\'s context header (e.g. "Custom content panel (embeddable_id: …)"). Always required — several panels can be attached to one conversation.'
        ),
      ...updateFields(),
    })
    .superRefine(rejectRemovedQueryFields(['esqlQuery', 'regenerateEsql', 'index']))
    .refine(hasSomethingToChange, atLeastOneChange)
    .refine(
      ({ dataQueries, removeAllQueries }) => !(dataQueries && removeAllQueries),
      removeAllExcludesDataQueries
    )
    .refine(
      ({ dataQueries, prompt }) =>
        prompt !== undefined || !dataQueries?.some(({ description }) => description !== undefined),
      dataQueryDescriptionsNeedPrompt
    )
);

export type CustomContentPanelUpdate = z.output<typeof customContentPanelUpdateSchema>;
