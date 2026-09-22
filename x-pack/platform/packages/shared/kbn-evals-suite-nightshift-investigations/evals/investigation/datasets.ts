/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from '@kbn/zod/v4';
import type { EvaluationDataset } from '@kbn/evals';
import { investigationExampleSchema, type InvestigationExample } from './types';

const investigationFileSchema = z.object({
  dataset: z
    .string()
    .min('nightshift/'.length + 1)
    .max(200)
    .startsWith('nightshift/'),
  description: z.string().max(2_000).optional(),
  tags: z.array(z.string().min(1).max(100)).max(20).default([]),
  examples: z.array(investigationExampleSchema).min(1).max(1_000),
});

/** Loads a file dataset for ungraded investigations, preserving optional labels and metadata. */
export const readInvestigationDataset = (
  path = process.env.NIGHTSHIFT_EXAMPLES_FILE ?? join(__dirname, 'synthetic.json')
): EvaluationDataset<InvestigationExample> => {
  const file = investigationFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  const caseIds = new Set<string>();
  for (const {
    metadata: { case_id: caseId },
  } of file.examples) {
    if (caseIds.has(caseId)) throw new Error(`Duplicate case_id: ${caseId}`);
    caseIds.add(caseId);
  }
  return {
    name: file.dataset,
    description: file.description ?? 'Ungraded investigations with complete agent traces.',
    tags: [...new Set(['nightshift', 'ungraded', ...file.tags])],
    examples: file.examples,
  };
};
