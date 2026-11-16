/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_KI_REFERENCE_URI_LENGTH, MAX_KI_TITLE_LENGTH } from './ki';

/**
 * Maximum characters of one piece of evidence. The research agent is asked for at most 1500;
 * the rest is slack, so a slightly longer answer does not fail the run.
 */
export const MAX_EVIDENCE_TEXT_LENGTH = 4000;
/** Maximum evidence a step takes in. */
export const MAX_EVIDENCE_ITEMS = 200;
export const MAX_RESEARCH_QUERY_LENGTH = 1024;
export const MAX_RESEARCH_SOURCE_REF_LENGTH = 512;
const MAX_EVIDENCE_ID_LENGTH = 64;

/** Refs of research sources: `esql:<hash of the query>` and `connector:<connector id>`. */
export const ESQL_SOURCE_REF_PREFIX = 'esql:';
export const CONNECTOR_SOURCE_REF_PREFIX = 'connector:';

export const evidenceIdSchema = lazySchema(() => z.string().min(1).max(MAX_EVIDENCE_ID_LENGTH));

/** A piece of information the research agent found in a source, to cite by its id. */
export const evidenceSchema = lazySchema(() =>
  z.object({
    id: evidenceIdSchema.describe('The id to cite the evidence by, such as `e-1`'),
    source: z.string().max(MAX_RESEARCH_SOURCE_REF_LENGTH).describe('The ref of the source'),
    uri: z
      .string()
      .min(1)
      .max(MAX_KI_REFERENCE_URI_LENGTH)
      .describe(
        'Where it came from: `index://<index>/<document id>` for a document, or the URL or id a connector returned'
      ),
    title: z.string().max(MAX_KI_TITLE_LENGTH).optional(),
    text: z.string().max(MAX_EVIDENCE_TEXT_LENGTH).describe('What it says'),
  })
);

export type Evidence = z.infer<typeof evidenceSchema>;

export const evidenceListSchema = lazySchema(() => z.array(evidenceSchema).max(MAX_EVIDENCE_ITEMS));
