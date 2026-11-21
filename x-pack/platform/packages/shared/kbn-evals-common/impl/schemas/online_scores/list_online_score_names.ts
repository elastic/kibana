/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. as one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Response of GET /internal/evals/online_scores/_names: every stored `score.name`
 * for one monitor, with the evaluator that most recently produced each name.
 */
export interface ListOnlineScoreNamesResponse {
  names: Array<{
    name: string;
    evaluatorName: string;
  }>;
}
