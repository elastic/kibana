/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { getEpisodeHeaderBadges } from './get_episode_header_badges';

describe('getEpisodeHeaderBadges', () => {
  it('maps each status to the expected badge color and label', () => {
    const statuses = [
      { status: ALERT_EPISODE_STATUS.ACTIVE, color: 'danger', label: 'Active' },
      { status: ALERT_EPISODE_STATUS.PENDING, color: 'warning', label: 'Pending' },
      { status: ALERT_EPISODE_STATUS.RECOVERING, color: 'primary', label: 'Recovering' },
      { status: ALERT_EPISODE_STATUS.INACTIVE, color: 'success', label: 'Inactive' },
    ] as const;

    for (const { status, color, label } of statuses) {
      const badges = getEpisodeHeaderBadges({
        status,
        severity: undefined,
        tags: [],
        episodeAction: undefined,
        groupAction: undefined,
      });

      expect(badges).toEqual([
        expect.objectContaining({
          label,
          color,
          'data-test-subj': 'alertingV2EpisodeDetailsHeaderStatusBadge',
        }),
      ]);
    }
  });

  it('uses hollow color and Unknown label for unsupported status values', () => {
    const badges = getEpisodeHeaderBadges({
      status: 'unsupported' as typeof ALERT_EPISODE_STATUS.ACTIVE,
      severity: undefined,
      tags: [],
      episodeAction: undefined,
      groupAction: undefined,
    });

    expect(badges[0]).toMatchObject({
      label: 'Unknown',
      color: 'hollow',
    });
  });

  it('overrides status to Inactive when deactivate action is present', () => {
    const badges = getEpisodeHeaderBadges({
      status: ALERT_EPISODE_STATUS.ACTIVE,
      severity: undefined,
      tags: [],
      episodeAction: undefined,
      groupAction: {
        groupHash: 'group-1',
        ruleId: 'rule-1',
        lastDeactivateAction: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
        lastSnoozeAction: null,
        snoozeExpiry: null,
        tags: [],
        lastSnoozeActor: null,
        lastDeactivateActor: null,
      },
    });

    expect(badges[0]).toMatchObject({
      label: 'Inactive',
      color: 'success',
    });
  });

  it('remaps high severity risk color to warning', () => {
    const badges = getEpisodeHeaderBadges({
      status: undefined,
      severity: 'high',
      tags: [],
      episodeAction: undefined,
      groupAction: undefined,
    });

    expect(badges).toEqual([
      expect.objectContaining({
        label: 'High',
        color: 'warning',
        'data-test-subj': 'alertingV2EpisodeSeverityBadge-high',
      }),
    ]);
  });

  it('adds acknowledged and snoozed text badges with tooltips', () => {
    const badges = getEpisodeHeaderBadges({
      status: ALERT_EPISODE_STATUS.ACTIVE,
      severity: undefined,
      tags: [],
      episodeAction: {
        episodeId: 'ep-1',
        ruleId: 'rule-1',
        groupHash: 'group-1',
        lastAckAction: ALERT_EPISODE_ACTION_TYPE.ACK,
        lastAssigneeUid: null,
        lastAckActor: null,
      },
      groupAction: {
        groupHash: 'group-1',
        ruleId: 'rule-1',
        lastDeactivateAction: null,
        lastSnoozeAction: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
        snoozeExpiry: '3035-05-08T12:00:00.000Z',
        tags: [],
        lastSnoozeActor: null,
        lastDeactivateActor: null,
      },
    });

    expect(badges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Acknowledged',
          'data-test-subj': 'alertingV2EpisodeDetailsHeaderAckBadge',
          tooltip: 'This alert is acknowledged.',
        }),
        expect.objectContaining({
          label: 'Snoozed',
          'data-test-subj': 'alertingV2EpisodeDetailsHeaderSnoozeBadge',
        }),
      ])
    );
    expect(badges.find((badge) => badge.label === 'Snoozed')?.tooltip).toContain('3035');
  });

  it('adds one hollow badge per tag', () => {
    const badges = getEpisodeHeaderBadges({
      status: undefined,
      severity: undefined,
      tags: ['tag-a', 'tag-b'],
      episodeAction: undefined,
      groupAction: undefined,
    });

    expect(badges).toEqual([
      expect.objectContaining({
        label: 'tag-a',
        color: 'hollow',
        'data-test-subj': 'alertingV2EpisodeDetailsHeaderTagBadge-tag-a',
      }),
      expect.objectContaining({
        label: 'tag-b',
        color: 'hollow',
        'data-test-subj': 'alertingV2EpisodeDetailsHeaderTagBadge-tag-b',
      }),
    ]);
  });
});
