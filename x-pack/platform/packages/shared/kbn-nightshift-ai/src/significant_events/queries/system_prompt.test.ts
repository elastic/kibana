/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantEventsAgentPrompt, significantEventsPrompt } from './prompt';

describe('significant events system prompt', () => {
  it('keeps the mustache variables the prompt template depends on', () => {
    // createGenerateSignificantEventsPrompt declares these as required inputs
    // (significant_events/prompt.ts). Losing one during an edit fails silently at runtime.
    expect(significantEventsPrompt).toContain('{{{available_feature_types}}}');
    expect(significantEventsPrompt).toContain('{{{computed_feature_instructions}}}');
  });

  it('keeps the STATS metric-series contract that getStatsQueryHints enforces', () => {
    // Each of these is a warning the tool emits back to the model at generation time.
    // If the prompt stops saying them, prompt and tool disagree.
    expect(significantEventsPrompt).toContain('BUCKET(@timestamp, 1 minute)');
    expect(significantEventsPrompt).toContain('KEEP bucket, metric_value');
  });
});

describe('significantEventsAgentPrompt', () => {
  it('renders all placeholders', () => {
    expect(significantEventsAgentPrompt).not.toContain('{{{');
    expect(significantEventsAgentPrompt).not.toContain('}}}');
  });
});
