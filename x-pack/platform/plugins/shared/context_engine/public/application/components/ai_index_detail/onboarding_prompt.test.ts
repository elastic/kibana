/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAiIndexOnboardingPrompt } from './onboarding_prompt';

describe('buildAiIndexOnboardingPrompt', () => {
  const params = {
    aiIndexId: 'my-ai-index',
    aiIndexDest: 'ai-index-ds-my-ai-index',
    kibanaUrl: 'https://my-kibana.example.com',
  };

  it('substitutes the AI index id, dest, and Kibana URL values', () => {
    const prompt = buildAiIndexOnboardingPrompt(params);

    expect(prompt).toContain('# You are connecting this project to the "my-ai-index" AI index');
    expect(prompt).toContain('`ai-index-ds-my-ai-index`');
    expect(prompt).toContain('`https://my-kibana.example.com`');
    expect(prompt).toContain('GET /api/context_engine/ai_index/my-ai-index/_describe');
  });
});
