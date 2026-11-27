/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CaseMarkerKind, EntryCategory } from './model';

export const LANE_CASE = i18n.translate('xpack.cases.incidentTimeline.laneCase', {
  defaultMessage: 'Case',
});

export const LANE_ENTRIES = i18n.translate('xpack.cases.incidentTimeline.laneEntries', {
  defaultMessage: 'Entries',
});

export const LANE_ALERTS = i18n.translate('xpack.cases.incidentTimeline.laneAlerts', {
  defaultMessage: 'Alerts',
});

export const CASE_STATUS_ROW = i18n.translate('xpack.cases.incidentTimeline.caseStatusRow', {
  defaultMessage: 'Status',
});

export const CATEGORY_LABELS: Record<EntryCategory, string> = {
  actor: i18n.translate('xpack.cases.incidentTimeline.category.actor', {
    defaultMessage: 'Actor',
  }),
  external: i18n.translate('xpack.cases.incidentTimeline.category.external', {
    defaultMessage: 'External',
  }),
  internal: i18n.translate('xpack.cases.incidentTimeline.category.internal', {
    defaultMessage: 'Internal',
  }),
  info: i18n.translate('xpack.cases.incidentTimeline.category.info', {
    defaultMessage: 'Info',
  }),
  uncategorized: i18n.translate('xpack.cases.incidentTimeline.category.uncategorized', {
    defaultMessage: 'Uncategorized',
  }),
};

export const MARKER_LABELS: Record<CaseMarkerKind, string> = {
  created: i18n.translate('xpack.cases.incidentTimeline.marker.created', {
    defaultMessage: 'Created',
  }),
  in_progress: i18n.translate('xpack.cases.incidentTimeline.marker.inProgress', {
    defaultMessage: 'Marked in progress',
  }),
  opened: i18n.translate('xpack.cases.incidentTimeline.marker.opened', {
    defaultMessage: 'Marked open',
  }),
  closed: i18n.translate('xpack.cases.incidentTimeline.marker.closed', {
    defaultMessage: 'Closed',
  }),
  reopened: i18n.translate('xpack.cases.incidentTimeline.marker.reopened', {
    defaultMessage: 'Reopened',
  }),
};

export const MARKER_CHANGES = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.markerChanges', {
    defaultMessage: '{count} status changes',
    values: { count },
  });

export const BY_USER = (user: string) =>
  i18n.translate('xpack.cases.incidentTimeline.byUser', {
    defaultMessage: 'by {user}',
    values: { user },
  });

export const VIA_SOURCE = (source: string) =>
  i18n.translate('xpack.cases.incidentTimeline.viaSource', {
    defaultMessage: 'via {source}',
    values: { source },
  });

export const DURATION = i18n.translate('xpack.cases.incidentTimeline.duration', {
  defaultMessage: 'Duration',
});

export const REOPEN_COUNT = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.reopenCount', {
    defaultMessage: '{count} {count, plural, one {reopen} other {reopens}}',
    values: { count },
  });

export const ALERT_COUNT = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.alertCount', {
    defaultMessage: '{count} {count, plural, one {alert} other {alerts}}',
    values: { count },
  });

export const ALERT_TIME = i18n.translate('xpack.cases.incidentTimeline.alertTime', {
  defaultMessage: 'Alert time',
});

export const WRITE_TIME = i18n.translate('xpack.cases.incidentTimeline.writeTime', {
  defaultMessage: 'Alert write time',
});

export const EVENT_TIME_UNAVAILABLE = i18n.translate(
  'xpack.cases.incidentTimeline.eventTimeUnavailable',
  { defaultMessage: 'Event time unavailable, showing alert write time' }
);

export const HOSTS = i18n.translate('xpack.cases.incidentTimeline.hosts', {
  defaultMessage: 'Hosts',
});

export const USERS = i18n.translate('xpack.cases.incidentTimeline.users', {
  defaultMessage: 'Users',
});

export const SEVERITY = i18n.translate('xpack.cases.incidentTimeline.severity', {
  defaultMessage: 'Severity',
});

export const DISTINCT_OF = (shown: string, count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.distinctOf', {
    defaultMessage: '{count} ({shown})',
    values: { shown, count },
  });

export const SELECTION = i18n.translate('xpack.cases.incidentTimeline.selection', {
  defaultMessage: 'Selection',
});

export const CLEAR_SELECTION = i18n.translate('xpack.cases.incidentTimeline.clearSelection', {
  defaultMessage: 'Clear selection',
});

export const MARK_AS_SIGNIFICANT = i18n.translate(
  'xpack.cases.incidentTimeline.markAsSignificant',
  { defaultMessage: 'Mark as significant' }
);

export const EDIT = i18n.translate('xpack.cases.incidentTimeline.edit', {
  defaultMessage: 'Edit',
});

export const DELETE = i18n.translate('xpack.cases.incidentTimeline.delete', {
  defaultMessage: 'Delete',
});

export const CREATED_BY = i18n.translate('xpack.cases.incidentTimeline.createdBy', {
  defaultMessage: 'Created by',
});

export const LINKED_ALERT = (ruleName: string) =>
  i18n.translate('xpack.cases.incidentTimeline.linkedAlert', {
    defaultMessage: 'Linked alert: {ruleName}',
    values: { ruleName },
  });

export const LINKED_ALERT_NOT_ATTACHED = i18n.translate(
  'xpack.cases.incidentTimeline.linkedAlertNotAttached',
  { defaultMessage: 'The linked alert is no longer attached.' }
);

export const FIELD_CATEGORY = i18n.translate('xpack.cases.incidentTimeline.fieldCategory', {
  defaultMessage: 'Category',
});

export const FIELD_TEXT = i18n.translate('xpack.cases.incidentTimeline.fieldText', {
  defaultMessage: 'Text',
});

export const TABLE_CAPTION = i18n.translate('xpack.cases.incidentTimeline.tableCaption', {
  defaultMessage: 'Case status changes, timeline entries and alerts, oldest first',
});

export const COLUMN_TIME = i18n.translate('xpack.cases.incidentTimeline.columnTime', {
  defaultMessage: 'Time',
});

export const COLUMN_EVENT = i18n.translate('xpack.cases.incidentTimeline.columnEvent', {
  defaultMessage: 'Event',
});

export const COLUMN_DETAILS = i18n.translate('xpack.cases.incidentTimeline.columnDetails', {
  defaultMessage: 'Details',
});

export const COLUMN_TIME_SOURCE = i18n.translate('xpack.cases.incidentTimeline.columnTimeSource', {
  defaultMessage: 'Time source',
});

export const COLUMN_HOST = i18n.translate('xpack.cases.incidentTimeline.columnHost', {
  defaultMessage: 'Host',
});

export const COLUMN_USER = i18n.translate('xpack.cases.incidentTimeline.columnUser', {
  defaultMessage: 'User',
});

export const COLUMN_ACTIONS = i18n.translate('xpack.cases.incidentTimeline.columnActions', {
  defaultMessage: 'Actions',
});

export const EVENT_STATUS = i18n.translate('xpack.cases.incidentTimeline.eventStatus', {
  defaultMessage: 'Case status',
});

export const EVENT_ENTRY = i18n.translate('xpack.cases.incidentTimeline.eventEntry', {
  defaultMessage: 'Entry',
});

export const EVENT_ALERT = i18n.translate('xpack.cases.incidentTimeline.eventAlert', {
  defaultMessage: 'Alert',
});

export const TIME_SOURCE_EVENT = i18n.translate('xpack.cases.incidentTimeline.timeSourceEvent', {
  defaultMessage: 'Event time',
});

export const TIME_SOURCE_WRITE = i18n.translate('xpack.cases.incidentTimeline.timeSourceWrite', {
  defaultMessage: 'Alert write time',
});

export const EDIT_ENTRY_ARIA = (title: string) =>
  i18n.translate('xpack.cases.incidentTimeline.editEntryAria', {
    defaultMessage: 'Edit entry {title}',
    values: { title },
  });

export const DELETE_ENTRY_ARIA = (title: string) =>
  i18n.translate('xpack.cases.incidentTimeline.deleteEntryAria', {
    defaultMessage: 'Delete entry {title}',
    values: { title },
  });

export const MARK_AS_SIGNIFICANT_ARIA = (ruleName: string, time: string) =>
  i18n.translate('xpack.cases.incidentTimeline.markAsSignificantAria', {
    defaultMessage: 'Mark the {ruleName} alert at {time} as significant',
    values: { ruleName, time },
  });

export const CASE_SPAN_ARIA = (status: string, range: string, duration: string) =>
  i18n.translate('xpack.cases.incidentTimeline.caseSpanAria', {
    defaultMessage: '{status} from {range}, {duration}',
    values: { status, range, duration },
  });

export const MARKER_ARIA = (change: string, time: string) =>
  i18n.translate('xpack.cases.incidentTimeline.markerAria', {
    defaultMessage: '{change} at {time}',
    values: { change, time },
  });

export const SEQUENCE_START_TIME = i18n.translate(
  'xpack.cases.incidentTimeline.sequenceStartTime',
  { defaultMessage: 'Sequence start (first event of the sequence)' }
);

export const TIME_SOURCE_SEQUENCE_START = i18n.translate(
  'xpack.cases.incidentTimeline.timeSourceSequenceStart',
  { defaultMessage: 'Sequence start' }
);

export const HOLLOW_POINTS_LEGEND = i18n.translate(
  'xpack.cases.incidentTimeline.hollowPointsLegend',
  { defaultMessage: 'Hollow points: event time unavailable, plotted at alert time' }
);
