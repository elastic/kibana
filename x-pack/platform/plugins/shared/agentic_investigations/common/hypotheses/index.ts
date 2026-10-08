/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  HYPOTHESES_ATTACHMENT_TYPE,
  HYPOTHESES_INDEX_NAME,
  HYPOTHESIS_STATUSES,
  MAX_HYPOTHESES,
  MAX_HYPOTHESIS_EVIDENCE,
  SET_HYPOTHESES_TOOL_ID,
} from './constants';

export {
  hypothesesListSchema,
  hypothesisSchema,
  hypothesisStatusSchema,
  investigationHypothesesSchema,
} from './hypotheses';

export type { Hypothesis, HypothesisStatus, InvestigationHypotheses } from './hypotheses';
