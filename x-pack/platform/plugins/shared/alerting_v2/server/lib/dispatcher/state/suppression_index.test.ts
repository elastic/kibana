/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlertEpisode, createAlertEpisodeSuppression } from '../fixtures/test_utils';
import { SuppressionIndex } from './suppression_index';

describe('SuppressionIndex', () => {
  it('suppresses by episode-level match', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: 'e1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    expect(index.suppressionReasonFor(episode)).toBe('ack');
  });

  it('suppresses by series-level match (null episode_id)', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: null,
        should_suppress: true,
        last_snooze_action: 'snooze',
      }),
    ]);

    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    expect(index.suppressionReasonFor(episode)).toBe('snooze');
  });

  it('uses deactivate reason when deactivated', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: 'e1',
        should_suppress: true,
        last_deactivate_action: 'deactivate',
      }),
    ]);

    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    expect(index.suppressionReasonFor(episode)).toBe('deactivate');
  });

  it('falls back to an unknown reason when no action is recorded', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: 'e1',
        should_suppress: true,
      }),
    ]);

    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    expect(index.suppressionReasonFor(episode)).toBe('unknown suppression reason');
  });

  it('prefers episode-level suppression over series-level', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: 'e1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
      createAlertEpisodeSuppression({
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: null,
        should_suppress: true,
        last_snooze_action: 'snooze',
      }),
    ]);

    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    expect(index.suppressionReasonFor(episode)).toBe('ack');
  });

  it('does not suppress when should_suppress is false', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: 'e1',
        should_suppress: false,
      }),
    ]);

    const episode = createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' });
    expect(index.suppressionReasonFor(episode)).toBeUndefined();
  });

  it('returns undefined for every episode when empty', () => {
    expect(SuppressionIndex.empty().suppressionReasonFor(createAlertEpisode())).toBeUndefined();
    expect(SuppressionIndex.empty().size).toBe(0);
  });

  it('suppresses external episode when suppression row uses source as key prefix', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        source: 'pagerduty',
        rule_id: null,
        group_hash: 'pd-hash',
        episode_id: 'pd-ep-1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const episode = createAlertEpisode({
      source: 'pagerduty',
      rule_id: null,
      group_hash: 'pd-hash',
      episode_id: 'pd-ep-1',
    });
    expect(index.suppressionReasonFor(episode)).toBe('ack');
  });

  it('internal and external suppressions coexist without key collision', () => {
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        source: 'internal',
        rule_id: 'rule-1',
        group_hash: 'hash-1',
        episode_id: 'ep-internal',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
      createAlertEpisodeSuppression({
        source: 'pagerduty',
        rule_id: null,
        group_hash: 'hash-1',
        episode_id: 'ep-external',
        should_suppress: false,
      }),
    ]);

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

    expect(index.suppressionReasonFor(internalEpisode)).toBe('ack');
    expect(index.suppressionReasonFor(externalEpisode)).toBeUndefined();
  });

  it('does not leak an external series suppression across spaces', () => {
    // Same vendor and group_hash in both spaces; the ack is series-scoped
    // (episode_id: null) and applies to space-a only.
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        source: 'pagerduty',
        rule_id: null,
        space_id: 'space-a',
        group_hash: 'pd-incident-1',
        episode_id: null,
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const externalEpisode = (spaceId: string) =>
      createAlertEpisode({
        source: 'pagerduty',
        rule_id: null,
        space_id: spaceId,
        group_hash: 'pd-incident-1',
        episode_id: 'pd-ep-1',
      });

    expect(index.suppressionReasonFor(externalEpisode('space-a'))).toBe('ack');
    expect(index.suppressionReasonFor(externalEpisode('space-b'))).toBeUndefined();
  });

  it('null-source suppression row (legacy internal) still matches internal episode by rule_id', () => {
    // Simulates a pre-existing row where source was not persisted (null)
    const index = SuppressionIndex.of([
      createAlertEpisodeSuppression({
        source: 'internal',
        rule_id: 'rule-1',
        group_hash: 'h1',
        episode_id: 'e1',
        should_suppress: true,
        last_ack_action: 'ack',
      }),
    ]);

    const episode = createAlertEpisode({
      source: 'internal',
      rule_id: 'rule-1',
      group_hash: 'h1',
      episode_id: 'e1',
    });
    expect(index.suppressionReasonFor(episode)).toBe('ack');
  });
});
