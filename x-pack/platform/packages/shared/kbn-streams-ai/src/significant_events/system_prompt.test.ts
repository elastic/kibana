/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantEventsPrompt } from './prompt';

// The override route stores this string as-is and validates it with
// `z.string().max(50_000)` (significant_events/server/routes/internal/prompts/route.ts).
// Zod counts UTF-16 code units, so assert `.length` — not bytes, not code points.
// The shipped default sits at ~43,500; 46,000 is a regression ceiling, not a target,
// and still leaves a deployment room to save an edited copy back through the route.
const OVERRIDE_CEILING = 46_000;

describe('significant events system prompt', () => {
  it('stays small enough to be saved back through the override route', () => {
    expect(significantEventsPrompt.length).toBeLessThanOrEqual(OVERRIDE_CEILING);
  });

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
