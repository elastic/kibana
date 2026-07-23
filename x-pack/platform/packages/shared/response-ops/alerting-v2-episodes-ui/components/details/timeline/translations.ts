/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** --- Timeline section (empty / error states) --- */
export const EMPTY_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.emptyTitle',
  {
    defaultMessage: 'No timeline events yet',
  }
);

export const EMPTY_BODY = i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.emptyBody', {
  defaultMessage: 'Status changes and actions will appear here.',
});

export const BULK_GET_PROFILES_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.bulkGetProfilesError',
  {
    defaultMessage: 'Could not load actor profiles',
  }
);

export const LOAD_MORE = i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.loadMore', {
  defaultMessage: 'Load more actions',
});

/** --- Timeline (shared labels) --- */
export const SYSTEM_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.systemLabel',
  {
    defaultMessage: 'system',
  }
);

/** --- Timeline (state-change sentences) --- */
export const STARTED_EPISODE_AS = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.startedEpisodeAs',
  {
    defaultMessage: 'started the episode as',
  }
);

export const CHANGED_STATUS_TO = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.changedStatusTo',
  {
    defaultMessage: 'changed the status to',
  }
);

export const SET_SEVERITY_TO = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.setSeverityTo',
  {
    defaultMessage: 'set the severity to',
  }
);

export const CHANGED_SEVERITY_TO = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.changedSeverityTo',
  {
    defaultMessage: 'changed the severity to',
  }
);

export const getAfterNEventsLabel = (count: number, prevStatus: string): string =>
  i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.afterNEvents', {
    defaultMessage: 'after {count} {prevStatus} {count, plural, one {event} other {events}}',
    values: { count, prevStatus },
  });

/** --- Timeline (action sentences) --- */
export const ACTION_LABELS: Record<string, string> = {
  ack: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.ack', {
    defaultMessage: 'acknowledged the episode',
  }),
  unack: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.unack', {
    defaultMessage: 'unacknowledged the episode',
  }),
  snooze: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.snooze', {
    defaultMessage: 'snoozed the episode',
  }),
  unsnooze: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.unsnooze', {
    defaultMessage: 'unsnoozed the episode',
  }),
  deactivate: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.deactivate', {
    defaultMessage: 'resolved the episode',
  }),
  activate: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.activate', {
    defaultMessage: 're-opened the episode',
  }),
  tag: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.tag', {
    defaultMessage: 'updated the tags',
  }),
  assign: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.actionLabel.assign', {
    defaultMessage: 'updated the assignee',
  }),
};

export const ASSIGNED_TO = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.assignedTo',
  {
    defaultMessage: 'assigned the episode to',
  }
);

export const REMOVED_ASSIGNEE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.removedAssignee',
  {
    defaultMessage: 'removed the assignee',
  }
);

export const STATUS_LABELS: Record<string, string> = {
  pending: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.statusLabel.pending', {
    defaultMessage: 'pending',
  }),
  active: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.statusLabel.active', {
    defaultMessage: 'active',
  }),
  recovering: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.statusLabel.recovering', {
    defaultMessage: 'recovering',
  }),
  inactive: i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.statusLabel.inactive', {
    defaultMessage: 'inactive',
  }),
};

/** --- Timeline (action event details) --- */
export const SNOOZED_INDEFINITELY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timeline.snoozedIndefinitely',
  {
    defaultMessage: 'Indefinitely',
  }
);

export const getSnoozedUntilLabel = (date: string): string =>
  i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.snoozedUntil', {
    defaultMessage: 'Until {date}',
    values: { date },
  });

export const formatSnoozeDuration = (startIso: string, endIso: string): string | null => {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return null;
  if (ms < 60 * 60 * 1000) {
    const n = Math.round(ms / (60 * 1000));
    return i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.snoozeDurationMinutes', {
      defaultMessage: '{n, plural, one {# minute} other {# minutes}}',
      values: { n },
    });
  }
  if (ms < 24 * 60 * 60 * 1000) {
    const n = Math.round(ms / (60 * 60 * 1000));
    return i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.snoozeDurationHours', {
      defaultMessage: '{n, plural, one {# hour} other {# hours}}',
      values: { n },
    });
  }
  const n = Math.round(ms / (24 * 60 * 60 * 1000));
  return i18n.translate('xpack.alertingV2EpisodesUi.details.timeline.snoozeDurationDays', {
    defaultMessage: '{n, plural, one {# day} other {# days}}',
    values: { n },
  });
};
