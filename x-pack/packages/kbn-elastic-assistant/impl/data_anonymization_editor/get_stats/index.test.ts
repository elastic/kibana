/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SelectedPromptContext } from '../../assistant/prompt_context/types';
import type { Stats } from '../helpers';
import { getStats } from '.';

describe('getStats', () => {
  it('returns ZERO_STATS for string rawData', () => {
    const context: SelectedPromptContext = {
      allow: [],
      allowReplacement: [],
      promptContextId: 'abcd',
      rawData: 'this will not be anonymized',
    };

    const expectedResult: Stats = {
      allowed: 0,
      anonymized: 0,
      denied: 0,
      total: 0,
    };

    expect(getStats(context)).toEqual(expectedResult);
  });

  it('returns the expected stats for object rawData', () => {
    const context: SelectedPromptContext = {
      allow: ['event.category', 'event.action', 'user.name'],
      allowReplacement: ['user.name', 'host.ip'], // only user.name is allowed to be sent
      promptContextId: 'abcd',
      rawData: {
        'event.category': ['process'],
        'event.action': ['process_stopped'],
        'user.name': ['sean'],
        other: ['this', 'is', 'not', 'allowed'],
      },
    };

    const expectedResult: Stats = {
      allowed: 3,
      anonymized: 1,
      denied: 1,
      total: 4,
    };

    expect(getStats(context)).toEqual(expectedResult);
  });
});
