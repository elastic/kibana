/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ScriptInferenceClient, KibanaClient } from '../../util/kibana_client';
import type { InferenceEvaluationClient } from '../evaluation_client';

// make services globals so they can more easily be used in the tests

function createErrorThrowingProxy(name: string): any {
  return new Proxy(
    {},
    {
      get: () => {
        throw new Error(`${name} has not been instantiated yet`);
      },
      set: () => {
        throw new Error(`${name} has not been instantiated yet`);
      },
    }
  );
}

export let chatClient: ScriptInferenceClient = createErrorThrowingProxy('evaluationClient');
export let evaluationClient: InferenceEvaluationClient =
  createErrorThrowingProxy('evaluationClient');

export let esClient: Client = createErrorThrowingProxy('esClient');
export let kibanaClient: KibanaClient = createErrorThrowingProxy('kibanaClient');
export let logger: ToolingLog = createErrorThrowingProxy('logger');

export const initServices = (services: {
  chatClient: ScriptInferenceClient;
  evaluationClient: InferenceEvaluationClient;
  esClient: Client;
  kibanaClient: KibanaClient;
  logger: ToolingLog;
}) => {
  chatClient = services.chatClient;
  evaluationClient = services.evaluationClient;
  esClient = services.esClient;
  kibanaClient = services.kibanaClient;
  logger = services.logger;
};
