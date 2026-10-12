/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_JUDGE_SCORE_DIRECTION, getJudgeScoreDirection } from './judge_score_direction';

describe('getJudgeScoreDirection', () => {
  it('returns the direction a score declares', () => {
    expect(getJudgeScoreDirection({ direction: 'minimize' })).toBe('minimize');
    expect(getJudgeScoreDirection({ direction: 'neutral' })).toBe('neutral');
    expect(getJudgeScoreDirection({ direction: 'maximize' })).toBe('maximize');
  });

  it('reads a score without a direction as higher-is-better', () => {
    expect(DEFAULT_JUDGE_SCORE_DIRECTION).toBe('maximize');
    expect(getJudgeScoreDirection({})).toBe('maximize');
  });
});
