/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS, type AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeGroupAction, EpisodeActionState } from '../types/action';
import { withEpisodeActionState } from './with_episode_action_state';

const mockEpisode: AlertEpisode = {
  '@timestamp': '2026-08-03T00:00:10.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-08-03T00:00:00.000Z',
  last_timestamp: '2026-08-03T00:00:10.000Z',
  duration: 10_000,
};

const mockEpisodeAction: EpisodeActionState = {
  episodeId: 'ep-1',
  ruleId: 'rule-1',
  groupHash: 'gh-1',
  lastAckAction: 'ack',
  lastAssigneeUid: 'user-1',
  lastAckActor: null,
  lastDeactivateAction: null,
  lastDeactivateActor: null,
  tags: ['tag-a'],
};

const mockGroupAction: AlertEpisodeGroupAction = {
  groupHash: 'gh-1',
  ruleId: 'rule-1',
  lastDeactivateAction: null,
  lastSnoozeAction: 'snooze',
  snoozedUntil: '2026-08-04T00:00:00.000Z',
  lastSnoozeActor: null,
  lastDeactivateActor: null,
};

describe('withEpisodeActionState', () => {
  it('returns undefined without an episode', () => {
    expect(withEpisodeActionState(undefined, mockEpisodeAction, mockGroupAction)).toBeUndefined();
  });

  it('adds the episode actions and the series snooze state', () => {
    expect(withEpisodeActionState(mockEpisode, mockEpisodeAction, mockGroupAction)).toEqual({
      ...mockEpisode,
      last_ack_action: 'ack',
      last_assignee_uid: 'user-1',
      last_tags: ['tag-a'],
      last_snooze_action: 'snooze',
      snoozed_until: '2026-08-04T00:00:00.000Z',
    });
  });

  it('empties the action columns when there are no actions', () => {
    expect(withEpisodeActionState(mockEpisode, undefined, undefined)).toEqual({
      ...mockEpisode,
      last_ack_action: null,
      last_assignee_uid: null,
      last_tags: [],
      last_snooze_action: null,
      snoozed_until: null,
    });
  });

  it('drops unknown action values', () => {
    const result = withEpisodeActionState(
      mockEpisode,
      { ...mockEpisodeAction, lastAckAction: 'deactivate' },
      { ...mockGroupAction, lastSnoozeAction: 'tag' }
    );
    expect(result?.last_ack_action).toBeNull();
    expect(result?.last_snooze_action).toBeNull();
  });
});
