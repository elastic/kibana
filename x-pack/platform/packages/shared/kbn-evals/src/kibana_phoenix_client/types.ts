/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example as PhoenixExample } from '@arizeai/phoenix-client/dist/esm/types/datasets';

export interface EvaluationExample {
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

export interface EvaluationDataset {
  name: string;
  description: string;
  examples: EvaluationExample[];
  id?: undefined;
}

export interface EvaluationDatasetWithId extends Omit<EvaluationDataset, 'id'> {
  id: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DefaultEvaluators {}

// simple version of Phoenix's ExampleWithId
export type PhoenixExampleWithId = PhoenixExample & { id: string };
