/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ENTITY_SUMMARY_HIGHLIGHTS,
  MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS,
  capEntitySummaryContent,
} from './entity_summary_limits';

const makeHighlights = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ title: `t${i}`, text: `x${i}` }));

const makeActions = (count: number) => Array.from({ length: count }, (_, i) => `action ${i}`);

describe('capEntitySummaryContent', () => {
  it('leaves content within budget untouched and reports zero dropped', () => {
    const highlights = makeHighlights(MAX_ENTITY_SUMMARY_HIGHLIGHTS);
    const recommendedActions = makeActions(MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS);

    const result = capEntitySummaryContent({ highlights, recommended_actions: recommendedActions });

    expect(result.highlights).toEqual(highlights);
    expect(result.recommended_actions).toEqual(recommendedActions);
    expect(result).toMatchObject({
      highlightsCount: MAX_ENTITY_SUMMARY_HIGHLIGHTS,
      recommendedActionsCount: MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS,
      highlightsDropped: 0,
      recommendedActionsDropped: 0,
    });
  });

  it('caps highlights to the max and preserves order', () => {
    const highlights = makeHighlights(MAX_ENTITY_SUMMARY_HIGHLIGHTS + 3);

    const result = capEntitySummaryContent({ highlights });

    expect(result.highlights).toEqual(highlights.slice(0, MAX_ENTITY_SUMMARY_HIGHLIGHTS));
    expect(result.highlightsCount).toBe(MAX_ENTITY_SUMMARY_HIGHLIGHTS + 3);
    expect(result.highlightsDropped).toBe(3);
  });

  it('caps recommended actions to the max and reports the overshoot', () => {
    const highlights = makeHighlights(1);
    const recommendedActions = makeActions(MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS + 2);

    const result = capEntitySummaryContent({ highlights, recommended_actions: recommendedActions });

    expect(result.recommended_actions).toEqual(
      recommendedActions.slice(0, MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS)
    );
    expect(result.recommendedActionsCount).toBe(MAX_ENTITY_SUMMARY_RECOMMENDED_ACTIONS + 2);
    expect(result.recommendedActionsDropped).toBe(2);
  });

  it('preserves null recommendedActions as null (does not coerce to [])', () => {
    const result = capEntitySummaryContent({ highlights: makeHighlights(1) });

    expect(result.recommended_actions).toBeNull();
    expect(result.recommendedActionsCount).toBe(0);
    expect(result.recommendedActionsDropped).toBe(0);
  });

  it('treats non-array inputs defensively', () => {
    const result = capEntitySummaryContent({
      // Simulate corrupted / unexpected model output.
      highlights: undefined as unknown as [],
      recommended_actions: 'nope' as unknown as string[],
    });

    expect(result.highlights).toEqual([]);
    expect(result.recommended_actions).toBeNull();
    expect(result.highlightsCount).toBe(0);
    expect(result.recommendedActionsCount).toBe(0);
  });
});
