/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, AlertEpisodeSuppression } from '../types';
import { createAlertEpisode, createAlertEpisodeSuppression } from '../fixtures/test_utils';
import { EpisodeTriage } from './episode_triage';
import { SuppressionIndex } from './suppression_index';

// Relocated from the former `applySuppression` free function in
// apply_suppression_step.ts — the same behavior is now the composition of
// SuppressionIndex.suppressionReasonFor and EpisodeTriage.partition.
const applySuppression = (
  episodes: readonly AlertEpisode[],
  suppressions: readonly AlertEpisodeSuppression[]
): EpisodeTriage => {
  const index = SuppressionIndex.of(suppressions);
  return EpisodeTriage.partition(episodes, (episode) => index.suppressionReasonFor(episode));
};

describe('SuppressionIndex', () => {
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

  it('suppresses external episode when suppression row uses source as key prefix', () => {
    const episode = createAlertEpisode({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'pd-hash',
      episode_id: 'pd-ep-1',
    });
    const suppression = createAlertEpisodeSuppression({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'pd-hash',
      episode_id: 'pd-ep-1',
      should_suppress: true,
      last_ack_action: 'ack',
    });

    const { suppressed, dispatchable } = applySuppression([episode], [suppression]);

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].reason).toBe('ack');
    expect(suppressed[0].episode_id).toBe('pd-ep-1');
    expect(dispatchable).toHaveLength(0);
  });

  it('internal and external suppressions coexist without key collision', () => {
    const internalEpisode = createAlertEpisode({
      source: 'internal',
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      episode_id: 'ep-internal',
    });
    const externalEpisode = createAlertEpisode({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'hash-1',
      episode_id: 'ep-external',
    });
    const internalSuppression = createAlertEpisodeSuppression({
      source: 'internal',
      rule_id: 'rule-1',
      group_hash: 'hash-1',
      episode_id: 'ep-internal',
      should_suppress: true,
      last_ack_action: 'ack',
    });
    const externalSuppression = createAlertEpisodeSuppression({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'hash-1',
      episode_id: 'ep-external',
      should_suppress: false,
    });

    const { suppressed, dispatchable } = applySuppression(
      [internalEpisode, externalEpisode],
      [internalSuppression, externalSuppression]
    );

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].episode_id).toBe('ep-internal');
    expect(dispatchable).toHaveLength(1);
    expect(dispatchable[0].episode_id).toBe('ep-external');
  });

  it('does not leak an external series suppression across spaces', () => {
    const externalEpisode = (spaceId: string) =>
      createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: spaceId,
        group_hash: 'pd-incident-1',
        episode_id: 'pd-ep-1',
      });
    // Same vendor and group_hash in both spaces; the ack is series-scoped
    // (episode_id: null) and applies to space-a only.
    const ackInSpaceA = createAlertEpisodeSuppression({
      source: 'pagerduty',
      rule_id: null,
      space_id: 'space-a',
      group_hash: 'pd-incident-1',
      episode_id: null,
      should_suppress: true,
      last_ack_action: 'ack',
    });

    const { suppressed, dispatchable } = applySuppression(
      [externalEpisode('space-a'), externalEpisode('space-b')],
      [ackInSpaceA]
    );

    expect(suppressed).toHaveLength(1);
    expect(suppressed[0].space_id).toBe('space-a');
    expect(dispatchable).toHaveLength(1);
    expect(dispatchable[0].space_id).toBe('space-b');
  });

  it('null-source suppression row (legacy internal) still matches internal episode by rule_id', () => {
    const episode = createAlertEpisode({
      source: 'internal',
      rule_id: 'rule-1',
      group_hash: 'h1',
      episode_id: 'e1',
    });
    // Simulates a pre-existing row where source was not persisted (null)
    const suppression = createAlertEpisodeSuppression({
      source: 'internal',
      rule_id: 'rule-1',
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
});
