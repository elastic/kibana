/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; the Elasticsearch License 2.0 including the Limited
 * Endpoint Management Terms. Use, modification, and distribution are subject
 * to the Elastic License 2.0.
 */

import {
  AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS,
  AGENT_BUILDER_RECOMMENDED_ENDPOINTS,
} from './constants';

// Chat-completion endpoints the Serverless trial EIS catalog serves. It serves none of the
// paid recommendations, so without a trial-served entry each list fails to resolve and every
// Agent Builder execution falls through to an arbitrary catalog default.
const TRIAL_CATALOG_CHAT_ENDPOINTS = [
  '.anthropic-claude-5-sonnet-chat_completion',
  '.gp-llm-v2-chat_completion',
  '.moonshot-kimi-k3-chat_completion',
  '.nvidia-nemotron-3-nano-chat_completion',
  '.nvidia-nemotron-3-ultra-chat_completion',
  '.nvidia-nemotron-3.5-lightning-chat_completion',
  '.nvidia-nemotron-3.5-super-vl-chat_completion',
  '.qwen-3.8-2.4t-a95b-chat_completion',
  '.zai-glm-5-2-chat_completion',
  '.zai-glm-5.3-chat_completion',
];

describe('recommended endpoints', () => {
  it('ends each list with a trial-served endpoint', () => {
    expect(TRIAL_CATALOG_CHAT_ENDPOINTS).toContain(
      AGENT_BUILDER_RECOMMENDED_ENDPOINTS.at(-1) ?? 'missing'
    );
    expect(TRIAL_CATALOG_CHAT_ENDPOINTS).toContain(
      AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS.at(-1) ?? 'missing'
    );
  });

  it('ends the two lists with distinct endpoints', () => {
    expect(AGENT_BUILDER_RECOMMENDED_ENDPOINTS.at(-1)).not.toEqual(
      AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS.at(-1)
    );
  });

  it('lists no endpoint twice', () => {
    const lists = [AGENT_BUILDER_RECOMMENDED_ENDPOINTS, AGENT_BUILDER_FAST_RECOMMENDED_ENDPOINTS];
    for (const list of lists) {
      expect(new Set(list).size).toBe(list.length);
    }
  });
});
