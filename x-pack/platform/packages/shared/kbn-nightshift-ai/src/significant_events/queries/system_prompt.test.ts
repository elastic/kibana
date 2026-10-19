/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantEventsAgentPrompt } from './prompt';

describe('significant events system prompt', () => {
  it('keeps the STATS metric-series contract that getStatsQueryHints enforces', () => {
    // Each of these is a warning the tool emits back to the model at generation time.
    // If the prompt stops saying them, prompt and tool disagree.
    expect(significantEventsAgentPrompt).toContain('BUCKET(@timestamp, 1 minute)');
    expect(significantEventsAgentPrompt).toContain('KEEP bucket, metric_value');
  });

  it('renders all placeholders', () => {
    expect(significantEventsAgentPrompt).not.toContain('{{{');
    expect(significantEventsAgentPrompt).not.toContain('}}}');
  });
});
