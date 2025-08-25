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

describe('getSystemPrompt - ECH | Observability Deployment | KB NOT ready | No ProductDoc', () => {
  it('matches snapshot', () => {
    const prompt = getSystemPrompt({
      availableFunctionNames,
      isServerless: false,
      isGenericDeployment: false,
      isObservabilityDeployment: true,
      isKnowledgeBaseReady: false,
      isProductDocAvailable: false,
    });

    expect(prompt).toMatchSnapshot();
  });
});
