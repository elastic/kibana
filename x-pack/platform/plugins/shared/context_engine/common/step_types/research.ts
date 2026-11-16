/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_KI_REFERENCE_URI_LENGTH, MAX_KI_TITLE_LENGTH } from './ki';

/** Maximum searches one search step runs. */
export const MAX_RESEARCH_SEARCHES = 10;
/** Maximum results one search returns, and the default. */
export const MAX_RESEARCH_RESULTS_PER_SEARCH = 10;
export const DEFAULT_RESEARCH_RESULTS_PER_SEARCH = 3;
/** Maximum characters of one piece of evidence. */
export const MAX_EVIDENCE_TEXT_LENGTH = 1500;
/** Maximum evidence a step takes in, and the evidence ids it can be told to skip. */
export const MAX_EVIDENCE_ITEMS = 200;
export const MAX_RESEARCH_QUERY_LENGTH = 1024;
export const MAX_RESEARCH_SOURCE_REF_LENGTH = 512;
export const MAX_RESEARCH_SUB_ACTION_LENGTH = 128;
export const MAX_RESEARCH_PARAMS_LENGTH = 8192;
const MAX_EVIDENCE_ID_LENGTH = 64;
const MAX_RESEARCH_ERROR_LENGTH = 2048;

/** Refs of research sources: `esql:<hash of the query>` and `connector:<connector id>`. */
export const ESQL_SOURCE_REF_PREFIX = 'esql:';
export const CONNECTOR_SOURCE_REF_PREFIX = 'connector:';

export const evidenceIdSchema = lazySchema(() => z.string().min(1).max(MAX_EVIDENCE_ID_LENGTH));

/** A piece of information a search found in a source, to cite by its id. */
export const evidenceSchema = lazySchema(() =>
  z.object({
    id: evidenceIdSchema.describe('Stable id to cite the evidence by, such as `e-1a2b3c4d`'),
    source: z.string().max(MAX_RESEARCH_SOURCE_REF_LENGTH).describe('The ref of the source'),
    uri: z
      .string()
      .min(1)
      .max(MAX_KI_REFERENCE_URI_LENGTH)
      .describe(
        'Where it came from: `index://<index>/<document id>`, the URL the connector returned, or `connector://<connector id>/<sub-action>/<hash>`'
      ),
    title: z.string().max(MAX_KI_TITLE_LENGTH).optional(),
    text: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).describe('What it says, shortened'),
  })
);

export type Evidence = z.infer<typeof evidenceSchema>;

export const evidenceListSchema = lazySchema(() => z.array(evidenceSchema).max(MAX_EVIDENCE_ITEMS));

/** One search the research model asks for. */
export const researchSearchSchema = lazySchema(() =>
  z.object({
    source: z
      .string()
      .min(1)
      .max(MAX_RESEARCH_SOURCE_REF_LENGTH)
      .describe('The ref of a source from the research source catalog'),
    query: z
      .string()
      .max(MAX_RESEARCH_QUERY_LENGTH)
      .optional()
      .describe('For an ES|QL source: the full-text query to run on its indices'),
    sub_action: z
      .string()
      .max(MAX_RESEARCH_SUB_ACTION_LENGTH)
      .optional()
      .describe('For a connector source: one of its read-only sub-actions'),
    params: z
      .union([
        z.record(z.string().max(256), z.unknown()),
        z.string().max(MAX_RESEARCH_PARAMS_LENGTH),
      ])
      .optional()
      .describe(
        'For a connector source: the parameters of the sub-action, as an object or a JSON object string'
      ),
  })
);

export type ResearchSearch = z.infer<typeof researchSearchSchema>;

export const researchErrorSchema = lazySchema(() =>
  z.object({
    source: z.string().max(MAX_RESEARCH_SOURCE_REF_LENGTH),
    message: z.string().max(MAX_RESEARCH_ERROR_LENGTH),
  })
);

export type ResearchError = z.infer<typeof researchErrorSchema>;
