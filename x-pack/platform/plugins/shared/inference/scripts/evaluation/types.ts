/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ScriptInferenceClient, KibanaClient } from '../util/kibana_client';
import type { InferenceEvaluationClient } from './evaluation_client';

export interface ScenarioOptions {
  esClient: Client;
  kibanaClient: KibanaClient;
  chatClient: ScriptInferenceClient;
  evaluationClient: InferenceEvaluationClient;
}

export interface EvaluationResult {
  name: string;
  category: string;
  input: string;
  passed: boolean;
  scores: Array<{
    criterion: string;
    reasoning: string;
    score: number;
  }>;
}

export type EvaluationFunction = (options: ScenarioOptions) => Promise<EvaluationResult>;
