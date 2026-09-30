/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplySuppressionStep } from './apply_suppression_step';
import {
  createAlertEpisode,
  createAlertEpisodeSuppression,
  createDispatcherPipelineState,
  createStepLogger,
} from '../fixtures/test_utils';

const logger = createStepLogger();

describe('ApplySuppressionStep', () => {
  const step = new ApplySuppressionStep();

  it('separates suppressed and active episodes', async () => {
    const ep1 = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const ep2 = createAlertEpisode({ rule_id: 'r2', group_hash: 'h2', episode_id: 'e2' });

    const state = createDispatcherPipelineState({
      episodes: [ep1, ep2],
      suppressions: [
        createAlertEpisodeSuppression({
          rule_id: 'r1',
          group_hash: 'h1',
          episode_id: 'e1',
          should_suppress: true,
          last_ack_action: 'ack',
        }),
        createAlertEpisodeSuppression({
          rule_id: 'r2',
          group_hash: 'h2',
          episode_id: 'e2',
          should_suppress: false,
        }),
      ],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;

    expect(result.data?.triage?.suppressed).toHaveLength(1);
    expect(result.data?.triage?.suppressed[0]).toEqual(
      expect.objectContaining({ rule_id: 'r1', reason: 'ack' })
    );
    expect(result.data?.triage?.dispatchable).toHaveLength(1);
    expect(result.data?.triage?.dispatchable[0]).toEqual(
      expect.objectContaining({ rule_id: 'r2' })
    );
  });

  it('treats all episodes as active when there are no suppressions', async () => {
    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode(), createAlertEpisode({ episode_id: 'e2' })],
      suppressions: [],
    });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable).toHaveLength(2);
    expect(result.data?.triage?.suppressed).toHaveLength(0);
  });

  it('handles empty episodes', async () => {
    const state = createDispatcherPipelineState({ episodes: [], suppressions: [] });

    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable).toHaveLength(0);
    expect(result.data?.triage?.suppressed).toHaveLength(0);
  });
});
