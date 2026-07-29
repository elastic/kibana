/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionView } from './latest';

export interface GetInitialSolutionSetupResponse {
  required: boolean;
}

export interface CompleteInitialSolutionSetupRequest {
  solution: SolutionView;
}

export type CompleteInitialSolutionSetupResponse = CompleteInitialSolutionSetupRequest;
