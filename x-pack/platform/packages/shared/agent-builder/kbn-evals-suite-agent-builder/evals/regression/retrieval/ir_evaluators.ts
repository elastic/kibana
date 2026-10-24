/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createPrecisionAtKEvaluator,
  createRecallAtKEvaluator,
  createF1AtKEvaluator,
  createHitRateAtKEvaluator,
} from '@kbn/evals';
import type { Evaluator, GroundTruth } from '@kbn/evals';
import { extractSearchRetrievedDocs } from '../../../src/ir_extractor';

/**
 * Some examples (the `info_not_found` tier) intentionally have no relevant documents:
 * they test that the agent says the answer is not in the corpus. IR metrics would score
 * a constant 0 on them (recall divides by zero relevant docs), dragging the dataset
 * averages with noise unrelated to retrieval quality. Return a null score instead —
 * null scores are excluded from aggregations and comparisons.
 */
const nullWhenNoGroundTruth = (evaluator: Evaluator): Evaluator => ({
  ...evaluator,
  evaluate: async (args) => {
    const groundTruth =
      (args.expected as { groundTruth?: GroundTruth } | undefined)?.groundTruth ?? {};
    if (Object.keys(groundTruth).length === 0) {
      return {
        score: null,
        metadata: { reason: 'no ground-truth documents (info_not_found example)' },
      };
    }
    return evaluator.evaluate(args);
  },
});

/**
 * Fixed IR evaluator set for the retrieval regression datasets: Precision/Recall/F1/
 * HitRate at k=10, mirroring the broad agent-builder suite's wiring (MRR/NDCG/MAP are
 * excluded there because multi-hop search concatenates tool-call results chronologically,
 * not by relevance rank). K is fixed in code — the regression gates pair scores by
 * evaluator name across runs, so no IR_EVAL_K env override.
 */
export const createRetrievalIrEvaluators = (): Evaluator[] => {
  const irConfig = {
    relevanceThreshold: 1,
    extractRetrievedDocs: extractSearchRetrievedDocs,
    extractGroundTruth: (referenceOutput: { groundTruth?: GroundTruth } | undefined) =>
      referenceOutput?.groundTruth ?? {},
  };
  const k = 10;
  return [
    createPrecisionAtKEvaluator(irConfig, k),
    createRecallAtKEvaluator(irConfig, k),
    createF1AtKEvaluator(irConfig, k),
    createHitRateAtKEvaluator(irConfig, k),
  ].map(nullWhenNoGroundTruth);
};
