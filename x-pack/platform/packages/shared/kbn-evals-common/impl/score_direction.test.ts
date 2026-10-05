/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SCORE_DIRECTION, getScoreDirection } from './score_direction';

describe('getScoreDirection', () => {
  it('returns the direction a score declares', () => {
    expect(getScoreDirection({ direction: 'minimize' })).toBe('minimize');
    expect(getScoreDirection({ direction: 'neutral' })).toBe('neutral');
  });

  it('reads a score without a direction as higher-is-better', () => {
    expect(DEFAULT_SCORE_DIRECTION).toBe('maximize');
    expect(getScoreDirection({})).toBe('maximize');
  });
});
