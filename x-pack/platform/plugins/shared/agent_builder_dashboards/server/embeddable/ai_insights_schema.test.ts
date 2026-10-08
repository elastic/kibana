/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AI_INSIGHTS_GENERATION_MODE,
  AI_INSIGHTS_HEIGHT_MODE,
  AI_INSIGHTS_REFRESH_MODE,
} from '../../common/ai_insights/constants';
import { aiInsightsEmbeddableSchema } from './ai_insights_schema';

describe('aiInsightsEmbeddableSchema', () => {
  it('applies connector default and leaves update modes optional', () => {
    const parsed = aiInsightsEmbeddableSchema.parse({});
    expect(parsed.connector_id).toBe('');
    expect(parsed.generation_mode).toBeUndefined();
    expect(parsed.refresh_mode).toBeUndefined();
    expect(parsed.height_mode).toBeUndefined();
  });

  it('accepts connector_id, update modes, and title fields', () => {
    const parsed = aiInsightsEmbeddableSchema.parse({
      connector_id: 'my-connector',
      generation_mode: AI_INSIGHTS_GENERATION_MODE.on_demand,
      refresh_mode: AI_INSIGHTS_REFRESH_MODE.manual,
      height_mode: AI_INSIGHTS_HEIGHT_MODE.fixed,
      title: 'AI Insights',
      hide_title: true,
      hide_border: false,
    });
    expect(parsed.connector_id).toBe('my-connector');
    expect(parsed.generation_mode).toBe(AI_INSIGHTS_GENERATION_MODE.on_demand);
    expect(parsed.refresh_mode).toBe(AI_INSIGHTS_REFRESH_MODE.manual);
    expect(parsed.height_mode).toBe(AI_INSIGHTS_HEIGHT_MODE.fixed);
    expect(parsed.title).toBe('AI Insights');
    expect(parsed.hide_title).toBe(true);
    expect(parsed.hide_border).toBe(false);
  });

  it('parses previously saved panels that only had connector_id', () => {
    expect(
      aiInsightsEmbeddableSchema.safeParse({
        connector_id: 'legacy-connector',
        title: 'AI Insights',
      }).success
    ).toBe(true);
  });
});
