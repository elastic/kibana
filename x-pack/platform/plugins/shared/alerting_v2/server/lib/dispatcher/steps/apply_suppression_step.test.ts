/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplySuppressionStep, applySuppression } from './apply_suppression_step';
import {
  createAlertEpisode,
  createAlertEpisodeSuppression,
  createDispatcherPipelineState,
} from '../fixtures/test_utils';

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

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;

    expect(result.data?.suppressed).toHaveLength(1);
    expect(result.data?.suppressed?.[0]).toEqual(
      expect.objectContaining({ rule_id: 'r1', reason: 'ack' })
    );
    expect(result.data?.dispatchable).toHaveLength(1);
    expect(result.data?.dispatchable?.[0]).toEqual(expect.objectContaining({ rule_id: 'r2' }));
  });

  it('treats all episodes as active when there are no suppressions', async () => {
    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode(), createAlertEpisode({ episode_id: 'e2' })],
      suppressions: [],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.dispatchable).toHaveLength(2);
    expect(result.data?.suppressed).toHaveLength(0);
  });

  it('handles empty episodes', async () => {
    const state = createDispatcherPipelineState({ episodes: [], suppressions: [] });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.dispatchable).toHaveLength(0);
    expect(result.data?.suppressed).toHaveLength(0);
  });
});

describe('applySuppression', () => {
  it('suppresses by episode-level match', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const suppression = createAlertEpisodeSuppression({
      rule_id: 'r1',
      group_hash: 'h1',
      episode_id: 'e1',
      should_suppress: true,
      last_ack_action: 'ack',
    });

    const { suppressed, dispatchable } = applySuppression([episode], [suppression]);

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].reason).toBe('ack');
    expect(dispatchable).toHaveLength(0);
  });

  it('suppresses by series-level match (null episode_id)', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const suppression = createAlertEpisodeSuppression({
      rule_id: 'r1',
      group_hash: 'h1',
      episode_id: null,
      should_suppress: true,
      last_snooze_action: 'snooze',
    });

    const { suppressed, dispatchable } = applySuppression([episode], [suppression]);

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].reason).toBe('snooze');
    expect(dispatchable).toHaveLength(0);
  });

  it('uses deactivate reason when deactivated', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const suppression = createAlertEpisodeSuppression({
      rule_id: 'r1',
      group_hash: 'h1',
      episode_id: 'e1',
      should_suppress: true,
      last_deactivate_action: 'deactivate',
    });

    const { suppressed } = applySuppression([episode], [suppression]);

    expect(suppressed[0].reason).toBe('deactivate');
  });

  it('prefers episode-level suppression over series-level', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const episodeSuppression = createAlertEpisodeSuppression({
      rule_id: 'r1',
      group_hash: 'h1',
      episode_id: 'e1',
      should_suppress: true,
      last_ack_action: 'ack',
    });
    const seriesSuppression = createAlertEpisodeSuppression({
      rule_id: 'r1',
      group_hash: 'h1',
      episode_id: null,
      should_suppress: true,
      last_snooze_action: 'snooze',
    });

    const { suppressed } = applySuppression([episode], [episodeSuppression, seriesSuppression]);

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].reason).toBe('ack');
  });

  it('does not suppress when should_suppress is false', () => {
    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    const suppression = createAlertEpisodeSuppression({
      rule_id: 'r1',
      group_hash: 'h1',
      episode_id: 'e1',
      should_suppress: false,
    });

    const { suppressed, dispatchable } = applySuppression([episode], [suppression]);

    expect(suppressed).toHaveLength(0);
    expect(dispatchable).toHaveLength(1);
  });
});
