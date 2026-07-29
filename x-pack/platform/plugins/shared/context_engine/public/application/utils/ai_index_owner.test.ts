/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { getAiIndexOwner } from './ai_index_owner';

const buildAiIndex = (overrides: Partial<AiIndexHttpItem> = {}): AiIndexHttpItem => ({
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'index', value: 'ai-index-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-07-17T00:00:00.000Z',
  date_modified: '2026-07-17T00:00:00.000Z',
  ...overrides,
});

describe('getAiIndexOwner', () => {
  it("returns 'managed' when the AI index has managed: true", () => {
    expect(getAiIndexOwner(buildAiIndex({ managed: true }))).toBe('managed');
  });

  it("returns 'user' when managed is false", () => {
    expect(getAiIndexOwner(buildAiIndex({ managed: false }))).toBe('user');
  });
});
