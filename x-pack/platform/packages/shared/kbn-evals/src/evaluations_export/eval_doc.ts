/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import evalDocV1 from './eval_doc.v1.json';
import type { EvaluationScoreDocument } from '../utils/score_repository';

export type EvalDocVersion = 'v1';

export const CURRENT_EVAL_DOC_VERSION: EvalDocVersion = 'v1';

function cloneDeep<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

const EVAL_DOCS: Record<EvalDocVersion, EvaluationScoreDocument> = {
  v1: evalDocV1 as unknown as EvaluationScoreDocument,
};

export function getEvalDoc(
  version: EvalDocVersion = CURRENT_EVAL_DOC_VERSION
): EvaluationScoreDocument {
  return cloneDeep(EVAL_DOCS[version]);
}
