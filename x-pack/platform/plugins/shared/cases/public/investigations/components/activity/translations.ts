/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING = i18n.translate('xpack.cases.investigations.activity.loading', {
  defaultMessage: 'Loading the timeline',
});
export const LOAD_ERROR = i18n.translate('xpack.cases.investigations.activity.loadError', {
  defaultMessage: 'The timeline could not be loaded',
});
export const SUMMARY_TITLE = i18n.translate('xpack.cases.investigations.activity.summaryTitle', {
  defaultMessage: 'What this is',
});
export const TIMELINE_TITLE = i18n.translate('xpack.cases.investigations.activity.timelineTitle', {
  defaultMessage: 'Timeline',
});
export const TIMELINE_SUBTITLE = (events: number, eventsSpan: string, entries: number) =>
  i18n.translate('xpack.cases.investigations.activity.timelineSubtitle', {
    defaultMessage:
      '{events, plural, one {# security event} other {# security events}} over {eventsSpan}, {entries, plural, one {# response entry} other {# response entries}}',
    values: { events, eventsSpan, entries },
  });
export const TIMELINE_SUBTITLE_NO_EVENTS = (entries: number) =>
  i18n.translate('xpack.cases.investigations.activity.timelineSubtitleNoEvents', {
    defaultMessage: '{entries, plural, one {# response entry} other {# response entries}}',
    values: { entries },
  });

/* Toolbar */
export const LANE_LABEL = i18n.translate('xpack.cases.investigations.activity.laneLabel', {
  defaultMessage: 'Timeline lane',
});
export const LANE_ALL = (count: number) =>
  i18n.translate('xpack.cases.investigations.activity.laneAll', {
    defaultMessage: 'All {count}',
    values: { count },
  });
export const LANE_SECURITY = (count: number) =>
  i18n.translate('xpack.cases.investigations.activity.laneSecurity', {
    defaultMessage: 'Security events {count}',
    values: { count },
  });
export const LANE_RESPONSE = (count: number) =>
  i18n.translate('xpack.cases.investigations.activity.laneResponse', {
    defaultMessage: 'Response log {count}',
    values: { count },
  });
export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.activity.searchPlaceholder',
  { defaultMessage: 'Search the timeline' }
);
export const ORDER_LABEL = i18n.translate('xpack.cases.investigations.activity.orderLabel', {
  defaultMessage: 'Sort order',
});
export const ORDER_OLDEST = i18n.translate('xpack.cases.investigations.activity.orderOldest', {
  defaultMessage: 'Oldest first',
});
export const ORDER_NEWEST = i18n.translate('xpack.cases.investigations.activity.orderNewest', {
  defaultMessage: 'Newest first',
});
export const JUMP_LATEST = i18n.translate('xpack.cases.investigations.activity.jumpLatest', {
  defaultMessage: 'Jump to latest',
});
export const JUMP_FIRST = i18n.translate('xpack.cases.investigations.activity.jumpFirst', {
  defaultMessage: 'Jump to first',
});
export const LEGEND = i18n.translate('xpack.cases.investigations.activity.legend', {
  defaultMessage:
    'Security events show what happened on hosts and identities. The response log shows what workers and people did about it. Times are UTC, and T+ counts from the first security event.',
});

/* Entries */
export const NO_ENTRIES_TITLE = i18n.translate(
  'xpack.cases.investigations.activity.noEntriesTitle',
  { defaultMessage: 'Nothing on the timeline yet' }
);
export const NO_ENTRIES_BODY = i18n.translate('xpack.cases.investigations.activity.noEntriesBody', {
  defaultMessage:
    'Security events and the response log appear here as the investigation progresses.',
});
export const NO_MATCH = i18n.translate('xpack.cases.investigations.activity.noMatch', {
  defaultMessage: 'No events match your search.',
});
export const LOAD_MORE = (remaining: number) =>
  i18n.translate('xpack.cases.investigations.activity.loadMore', {
    defaultMessage: 'Load more ({remaining} not shown yet)',
    values: { remaining },
  });
export const LOADING_MORE = i18n.translate('xpack.cases.investigations.activity.loadingMore', {
  defaultMessage: 'Loading more',
});
export const HELD_BACK = (count: number) =>
  i18n.translate('xpack.cases.investigations.activity.heldBack', {
    defaultMessage:
      '{count, plural, one {# security event} other {# security events}} beyond the loaded response log will show once more is loaded.',
    values: { count },
  });
export const EVENT_BADGE = i18n.translate('xpack.cases.investigations.activity.eventBadge', {
  defaultMessage: 'Security event',
});
export const RESPONSE_BADGE = i18n.translate('xpack.cases.investigations.activity.responseBadge', {
  defaultMessage: 'Response',
});
export const SUSPECTED = i18n.translate('xpack.cases.investigations.activity.suspected', {
  defaultMessage: 'Suspected',
});
export const ALERT_SEVERITY = (severity: string) =>
  i18n.translate('xpack.cases.investigations.activity.alertSeverity', {
    defaultMessage: 'Alert, {severity}',
    values: { severity },
  });
export const OBSERVED_BY = (source: string) =>
  i18n.translate('xpack.cases.investigations.activity.observedBy', {
    defaultMessage: 'Observed by {source}',
    values: { source },
  });
export const T_PLUS = (duration: string) =>
  i18n.translate('xpack.cases.investigations.activity.tPlus', {
    defaultMessage: 'T+{duration}',
    values: { duration },
  });
export const T_MINUS = (duration: string) =>
  i18n.translate('xpack.cases.investigations.activity.tMinus', {
    defaultMessage: 'T-{duration}',
    values: { duration },
  });
export const T_ZERO = i18n.translate('xpack.cases.investigations.activity.tZero', {
  defaultMessage: 'T+0',
});
export const SHOW_DETAILS = i18n.translate('xpack.cases.investigations.activity.showDetails', {
  defaultMessage: 'Show details',
});
export const HIDE_DETAILS = i18n.translate('xpack.cases.investigations.activity.hideDetails', {
  defaultMessage: 'Hide details',
});
export const BEFORE = i18n.translate('xpack.cases.investigations.activity.before', {
  defaultMessage: 'Before',
});
export const AFTER = i18n.translate('xpack.cases.investigations.activity.after', {
  defaultMessage: 'After',
});
export const ACTION_LABEL = i18n.translate('xpack.cases.investigations.activity.actionLabel', {
  defaultMessage: 'Action',
});
export const DAY_ENTRIES = (count: number) =>
  i18n.translate('xpack.cases.investigations.activity.dayEntries', {
    defaultMessage: '{count, plural, one {# entry} other {# entries}}',
    values: { count },
  });

/* Stages */
export const STAGES_TITLE = i18n.translate('xpack.cases.investigations.activity.stagesTitle', {
  defaultMessage: 'Attack progression',
});
export const STAGES_SUBTITLE = (time: string) =>
  i18n.translate('xpack.cases.investigations.activity.stagesSubtitle', {
    defaultMessage: 'From the first security event, {time}',
    values: { time },
  });
export const STAGE_CONFIRMED = i18n.translate(
  'xpack.cases.investigations.activity.stageConfirmed',
  { defaultMessage: 'Observed' }
);
export const STAGE_SUSPECTED = i18n.translate(
  'xpack.cases.investigations.activity.stageSuspected',
  { defaultMessage: 'Suspected' }
);
export const STAGE_NO_MITRE = i18n.translate('xpack.cases.investigations.activity.stageNoMitre', {
  defaultMessage: 'ATT&CK not mapped',
});
export const STAGE_OPEN = (stage: string) =>
  i18n.translate('xpack.cases.investigations.activity.stageOpen', {
    defaultMessage: 'Go to the first {stage} event',
    values: { stage },
  });

/* Links */
export const LINK_EVIDENCE = (label: string) =>
  i18n.translate('xpack.cases.investigations.activity.linkEvidence', {
    defaultMessage: 'Evidence {label}',
    values: { label },
  });
export const LINK_CLAIM = (label: string) =>
  i18n.translate('xpack.cases.investigations.activity.linkClaim', {
    defaultMessage: 'Claim {label}',
    values: { label },
  });
export const LINK_PROPOSAL = (label: string) =>
  i18n.translate('xpack.cases.investigations.activity.linkProposal', {
    defaultMessage: 'Action {label}',
    values: { label },
  });
export const LINK_TASK = i18n.translate('xpack.cases.investigations.activity.linkTask', {
  defaultMessage: 'Task',
});
export const LINK_ENTITY = i18n.translate('xpack.cases.investigations.activity.linkEntity', {
  defaultMessage: 'Entity',
});
export const LINK_LINK = i18n.translate('xpack.cases.investigations.activity.linkLink', {
  defaultMessage: 'Link in scope graph',
});
export const LINK_THREAD = i18n.translate('xpack.cases.investigations.activity.linkThread', {
  defaultMessage: 'Open thread',
});
export const LINK_VERDICT = i18n.translate('xpack.cases.investigations.activity.linkVerdict', {
  defaultMessage: 'Verdict',
});
export const LINK_OPEN = (label: string) =>
  i18n.translate('xpack.cases.investigations.activity.linkOpen', {
    defaultMessage: 'Open {label}',
    values: { label },
  });
export const TAB_OVERVIEW = i18n.translate('xpack.cases.investigations.activity.tabOverview', {
  defaultMessage: 'Overview',
});
export const TAB_CONVERSATION = i18n.translate(
  'xpack.cases.investigations.activity.tabConversation',
  { defaultMessage: 'Conversation' }
);
export const TAB_EVIDENCE = i18n.translate('xpack.cases.investigations.activity.tabEvidence', {
  defaultMessage: 'Evidence',
});
export const TAB_SCOPE = i18n.translate('xpack.cases.investigations.activity.tabScope', {
  defaultMessage: 'Scope',
});
export const TAB_PROCEDURE = i18n.translate('xpack.cases.investigations.activity.tabProcedure', {
  defaultMessage: 'Procedure',
});
export const TAB_ACTIVITY = i18n.translate('xpack.cases.investigations.activity.tabActivity', {
  defaultMessage: 'Activity',
});

/* Origin of an entry written by something other than a person */
export const ORIGIN_AGENT = i18n.translate('xpack.cases.investigations.activity.originAgent', {
  defaultMessage: 'via agent',
});
export const ORIGIN_WORKFLOW = i18n.translate(
  'xpack.cases.investigations.activity.originWorkflow',
  { defaultMessage: 'via workflow' }
);
export const ORIGIN_RULE = i18n.translate('xpack.cases.investigations.activity.originRule', {
  defaultMessage: 'via rule',
});
export const ORIGIN_API = i18n.translate('xpack.cases.investigations.activity.originApi', {
  defaultMessage: 'via API',
});
export const ORIGIN_CONNECTOR = i18n.translate(
  'xpack.cases.investigations.activity.originConnector',
  { defaultMessage: 'via connector' }
);
export const STATUS_WITH_PAUSE_REASON = (label: string, reason: string) =>
  i18n.translate('xpack.cases.investigations.activity.statusWithPauseReason', {
    defaultMessage: '{label} (paused: {reason})',
    values: { label, reason },
  });
export const OPEN_EXTERNAL_TICKET = i18n.translate(
  'xpack.cases.investigations.activity.openExternalTicket',
  { defaultMessage: 'Open the external incident' }
);
