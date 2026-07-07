/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

// DEV ONLY: fake region data — do NOT commit.
const DEV_FAKE_REGIONS: Record<string, Array<{ csp: string; region: string; geo: string }>> = {
  'openai-gpt-4.1': [
    { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
    { csp: 'aws', region: 'eu-central-1', geo: 'eu' },
    { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    { csp: 'aws', region: 'us-east-1', geo: 'us' },
    { csp: 'gcp', region: 'us-east4', geo: 'us' },
    { csp: 'gcp', region: 'us-east5', geo: 'us' },
    { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
    { csp: 'aws', region: 'ap-southeast-1', geo: 'apac' },
    { csp: 'aws', region: 'ap-northeast-1', geo: 'apac' },
  ],
  'openai-gpt-4.1-mini': [
    { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    { csp: 'aws', region: 'us-east-1', geo: 'us' },
    { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
  ],
  'anthropic-claude-4.6-sonnet': [
    { csp: 'aws', region: 'eu-central-1', geo: 'eu' },
    { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
    { csp: 'gcp', region: 'us-east4', geo: 'us' },
    { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
    { csp: 'aws', region: 'ap-southeast-1', geo: 'apac' },
  ],
  'anthropic-claude-4.5-haiku': [
    { csp: 'gcp', region: 'us-east5', geo: 'us' },
    { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
    { csp: 'aws', region: 'ap-southeast-1', geo: 'apac' },
  ],
  'google-gemini-2.5-flash': [
    { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
    { csp: 'gcp', region: 'us-east4', geo: 'us' },
    { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
  ],
  'jina-embeddings-v3': [
    { csp: 'aws', region: 'eu-west-1', geo: 'eu' },
    { csp: 'aws', region: 'us-east-1', geo: 'us' },
  ],
  elser_model_2: [
    { csp: 'aws', region: 'eu-central-1', geo: 'eu' },
    { csp: 'gcp', region: 'us-east4', geo: 'us' },
    { csp: 'gcp', region: 'asia-southeast1', geo: 'apac' },
  ],
};

export const fetchInferenceEndpoints = async (
  client: ElasticsearchClient
): Promise<{
  inferenceEndpoints: InferenceAPIConfigResponse[];
}> => {
  const { endpoints } = await client.inference.get({
    inference_id: '_all',
  });

  // DEV ONLY: inject fake regions for local UI testing.
  const augmented = (endpoints as InferenceAPIConfigResponse[]).map((ep) => {
    const modelId = (ep.service_settings as { model_id?: string })?.model_id;
    const fakeRegions = modelId ? DEV_FAKE_REGIONS[modelId] : undefined;
    if (!fakeRegions) return ep;
    return { ...ep, metadata: { ...(ep.metadata ?? {}), regions: fakeRegions } };
  });

  return { inferenceEndpoints: augmented };
};
