/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSystemPrompt } from '../system_prompt';

const availableFunctionNames = [
  'lens',
  'execute_query',
  'query',
  'visualize_query',
  'get_alerts_dataset_info',
  'alerts',
  'changes',
  'retrieve_elastic_doc',
  'summarize',
  'context',
  'elasticsearch',
  'kibana',
  'get_dataset_info',
  'execute_connector',
];

describe('getSystemPrompt - Serverless | Observability Deployment | KB ready | ProductDoc available', () => {
  it('matches snapshot', () => {
    const prompt = getSystemPrompt({
      availableFunctionNames,
      isServerless: true,
      isGenericDeployment: false,
      isObservabilityDeployment: true,
      isKnowledgeBaseReady: true,
      isProductDocAvailable: true,
    });

    expect(prompt).toMatchSnapshot();
  });
});
