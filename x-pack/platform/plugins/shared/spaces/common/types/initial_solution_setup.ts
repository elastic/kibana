/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Solutions offered by initial solution setup.
 * Narrower than {@link SolutionView}, which also includes serverless-only values.
 */
export type InitialSolutionSetupView = 'classic' | 'es' | 'oblt' | 'security';

export interface GetInitialSolutionSetupResponse {
  required: boolean;
}

export interface CompleteInitialSolutionSetupRequest {
  solution: InitialSolutionSetupView;
}

export type CompleteInitialSolutionSetupResponse = CompleteInitialSolutionSetupRequest;
