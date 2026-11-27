/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CaseMarkerKind, EntryCategory } from './model';

export const PANEL_TITLE = i18n.translate('xpack.cases.incidentTimeline.panelTitle', {
  defaultMessage: 'Incident timeline',
});

export const RESET_ZOOM = i18n.translate('xpack.cases.incidentTimeline.resetZoom', {
  defaultMessage: 'Reset zoom',
});

export const ADD_ENTRY = i18n.translate('xpack.cases.incidentTimeline.addEntry', {
  defaultMessage: 'Add entry',
});

export const OPEN_IN_DISCOVER = i18n.translate('xpack.cases.incidentTimeline.openInDiscover', {
  defaultMessage: 'Open alerts in Discover',
});

export const DISCOVER_UNAVAILABLE = i18n.translate(
  'xpack.cases.incidentTimeline.discoverUnavailable',
  { defaultMessage: 'Discover is not available in this deployment.' }
);

export const DATA_VIEW_NAME = (caseTitle: string) =>
  i18n.translate('xpack.cases.incidentTimeline.dataViewName', {
    defaultMessage: 'Alerts in case {caseTitle}',
    values: { caseTitle },
  });

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

export const NO_ALERTS = i18n.translate('xpack.cases.incidentTimeline.noAlerts', {
  defaultMessage: 'No alerts are attached to this case.',
});

export const ALERTS_ERROR = i18n.translate('xpack.cases.incidentTimeline.alertsError', {
  defaultMessage: 'Unable to load the alerts of this case',
});

export const RETRY = i18n.translate('xpack.cases.incidentTimeline.retry', {
  defaultMessage: 'Retry',
});

export const NOT_FOUND = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.notFound', {
    defaultMessage:
      '{count, plural, one {# attached alert could not be loaded. It may have been deleted or you may not have access to its index.} other {# attached alerts could not be loaded. They may have been deleted or you may not have access to their index.}}',
    values: { count },
  });

export const REMOTE = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.remote', {
    defaultMessage:
      '{count} {count, plural, one {alert} other {alerts}} from linked projects {count, plural, one {is} other {are}} not shown.',
    values: { count },
  });

export const AT_LIMIT = i18n.translate('xpack.cases.incidentTimeline.atLimit', {
  defaultMessage: "This case has reached the 1,000-alert limit. Newer alerts can't be attached.",
});

export const SHOW_MORE_RULES = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.showMoreRules', {
    defaultMessage: 'Show {count} more {count, plural, one {rule} other {rules}}',
    values: { count },
  });

export const SHOW_FEWER_RULES = i18n.translate('xpack.cases.incidentTimeline.showFewerRules', {
  defaultMessage: 'Show fewer rules',
});

export const REOPEN_COUNT = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.reopenCount', {
    defaultMessage: '{count} {count, plural, one {reopen} other {reopens}}',
    values: { count },
  });

export const ALERTS_PRIVILEGES_TITLE = i18n.translate(
  'xpack.cases.incidentTimeline.alertsPrivilegesTitle',
  { defaultMessage: 'Privileges required' }
);

export const ALERTS_PRIVILEGES_BODY = i18n.translate(
  'xpack.cases.incidentTimeline.alertsPrivilegesBody',
  {
    defaultMessage:
      'To view alerts, you must update privileges. For more information, contact your Kibana administrator.',
  }
);

export const DISCOVER_COUNT_MAY_DIFFER = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.discoverCountMayDiffer', {
    defaultMessage:
      'The timeline shows {count} {count, plural, one {alert} other {alerts}}. Discover searches by case id, so it may show a different number of alerts.',
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

export const ENTRY_DELETED = i18n.translate('xpack.cases.incidentTimeline.entryDeleted', {
  defaultMessage: 'Timeline entry deleted',
});

export const DELETE_ENTRY_TITLE = (title: string) =>
  i18n.translate('xpack.cases.incidentTimeline.deleteEntryTitle', {
    defaultMessage: 'Delete the timeline entry "{title}"?',
    values: { title },
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

export const ADD_ENTRY_TITLE = i18n.translate('xpack.cases.incidentTimeline.addEntryTitle', {
  defaultMessage: 'Add timeline entry',
});

export const EDIT_ENTRY_TITLE = i18n.translate('xpack.cases.incidentTimeline.editEntryTitle', {
  defaultMessage: 'Edit timeline entry',
});

export const FIELD_TITLE = i18n.translate('xpack.cases.incidentTimeline.fieldTitle', {
  defaultMessage: 'Title',
});

export const FIELD_TIME = i18n.translate('xpack.cases.incidentTimeline.fieldTime', {
  defaultMessage: 'Time',
});

export const FIELD_TIME_HELP = (timeZone: string) =>
  i18n.translate('xpack.cases.incidentTimeline.fieldTimeHelp', {
    defaultMessage: 'Set an end time to make the entry a range. Time zone: {timeZone}',
    values: { timeZone },
  });

export const START_TIME_ARIA = i18n.translate('xpack.cases.incidentTimeline.startTimeAria', {
  defaultMessage: 'Start time',
});

export const END_TIME_ARIA = i18n.translate('xpack.cases.incidentTimeline.endTimeAria', {
  defaultMessage: 'End time, optional',
});

export const FIELD_CATEGORY = i18n.translate('xpack.cases.incidentTimeline.fieldCategory', {
  defaultMessage: 'Category',
});

export const FIELD_TEXT = i18n.translate('xpack.cases.incidentTimeline.fieldText', {
  defaultMessage: 'Text',
});

export const CATEGORY_NONE = i18n.translate('xpack.cases.incidentTimeline.categoryNone', {
  defaultMessage: 'None',
});

export const TITLE_REQUIRED = i18n.translate('xpack.cases.incidentTimeline.titleRequired', {
  defaultMessage: 'Enter a title.',
});

export const TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.incidentTimeline.tooLong', {
    defaultMessage: 'Use {max} characters or fewer.',
    values: { max },
  });

export const END_BEFORE_START = i18n.translate('xpack.cases.incidentTimeline.endBeforeStart', {
  defaultMessage: 'The end time must not be before the start time.',
});

export const SAVE = i18n.translate('xpack.cases.incidentTimeline.save', {
  defaultMessage: 'Save',
});

export const CANCEL = i18n.translate('xpack.cases.incidentTimeline.cancel', {
  defaultMessage: 'Cancel',
});

export const ENTRY_LABEL = i18n.translate('xpack.cases.incidentTimeline.entryLabel', {
  defaultMessage: 'Timeline entry',
});

export const ENTRY_COUNT = (count: number) =>
  i18n.translate('xpack.cases.incidentTimeline.entryCount', {
    defaultMessage: '{count} timeline {count, plural, one {entry} other {entries}}',
    values: { count },
  });

export const ADDED_ENTRY = i18n.translate('xpack.cases.incidentTimeline.addedEntry', {
  defaultMessage: 'added a timeline entry',
});

export const REMOVED_ENTRY = i18n.translate('xpack.cases.incidentTimeline.removedEntry', {
  defaultMessage: 'removed a timeline entry',
});

export const SHOW_ON_TIMELINE = i18n.translate('xpack.cases.incidentTimeline.showOnTimeline', {
  defaultMessage: 'Show on timeline',
});

export const VIEW_LEGEND = i18n.translate('xpack.cases.incidentTimeline.viewLegend', {
  defaultMessage: 'Timeline view',
});

export const VIEW_CHART = i18n.translate('xpack.cases.incidentTimeline.viewChart', {
  defaultMessage: 'Chart',
});

export const VIEW_TABLE = i18n.translate('xpack.cases.incidentTimeline.viewTable', {
  defaultMessage: 'Table',
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
