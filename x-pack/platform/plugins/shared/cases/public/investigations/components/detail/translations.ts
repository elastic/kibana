/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TAKE_ACTION = i18n.translate('xpack.cases.investigations.detail.takeAction', {
  defaultMessage: 'Take action',
});
export const ACTIONS_MENU_TITLE = i18n.translate(
  'xpack.cases.investigations.detail.actionsMenuTitle',
  { defaultMessage: 'Investigation' }
);
export const SET_DETERMINATION = i18n.translate(
  'xpack.cases.investigations.detail.setDetermination',
  { defaultMessage: 'Set your determination' }
);
export const EDIT_DETERMINATION = i18n.translate(
  'xpack.cases.investigations.detail.editDetermination',
  { defaultMessage: 'Edit your determination' }
);
export const GENERATE_REPORT = i18n.translate('xpack.cases.investigations.detail.generateReport', {
  defaultMessage: 'Generate report',
});
export const CHANGE_HISTORY = i18n.translate('xpack.cases.investigations.detail.changeHistory', {
  defaultMessage: 'Change history',
});
export const MERGE = i18n.translate('xpack.cases.investigations.detail.merge', {
  defaultMessage: 'Merge with another investigation',
});
export const CLOSE_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.detail.closeInvestigation',
  { defaultMessage: 'Close investigation' }
);
export const REOPEN_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.detail.reopenInvestigation',
  { defaultMessage: 'Reopen investigation' }
);

export const OWNER = i18n.translate('xpack.cases.investigations.detail.owner', {
  defaultMessage: 'Owner',
});
export const UNASSIGNED = i18n.translate('xpack.cases.investigations.detail.unassigned', {
  defaultMessage: 'Unassigned',
});
export const TAKE_OWNERSHIP = i18n.translate('xpack.cases.investigations.detail.takeOwnership', {
  defaultMessage: 'Take ownership',
});
export const TAKE_OWNERSHIP_SUCCESS = i18n.translate(
  'xpack.cases.investigations.detail.takeOwnershipSuccess',
  { defaultMessage: 'You now own this investigation.' }
);
export const VERDICT = i18n.translate('xpack.cases.investigations.detail.verdict', {
  defaultMessage: 'Verdict',
});
export const PRIORITY = i18n.translate('xpack.cases.investigations.detail.priority', {
  defaultMessage: 'Priority',
});
export const PARTICIPANTS = i18n.translate('xpack.cases.investigations.detail.participants', {
  defaultMessage: 'Participants',
});
export const AGE = i18n.translate('xpack.cases.investigations.detail.age', {
  defaultMessage: 'Age',
});
export const SCOPE = i18n.translate('xpack.cases.investigations.detail.scope', {
  defaultMessage: 'Scope',
});
export const ORIGIN_LABEL = i18n.translate('xpack.cases.investigations.detail.originLabel', {
  defaultMessage: 'How this investigation started',
});

export const HOSTS = (count: number) =>
  i18n.translate('xpack.cases.investigations.detail.hosts', {
    defaultMessage: '{count, plural, one {# host} other {# hosts}}',
    values: { count },
  });
export const IDENTITIES = (count: number) =>
  i18n.translate('xpack.cases.investigations.detail.identities', {
    defaultMessage: '{count, plural, one {# identity} other {# identities}}',
    values: { count },
  });
export const NOTHING_IN_SCOPE = i18n.translate('xpack.cases.investigations.detail.nothingInScope', {
  defaultMessage: 'Nothing yet',
});
export const SUSPECTED = (count: number) =>
  i18n.translate('xpack.cases.investigations.detail.suspected', {
    defaultMessage: '+{count} suspected',
    values: { count },
  });

export const PARTICIPANTS_MORE = (count: number) =>
  i18n.translate('xpack.cases.investigations.detail.participantsMore', {
    defaultMessage: '+{count}',
    values: { count },
  });

export const TABS_LABEL = i18n.translate('xpack.cases.investigations.detail.tabsLabel', {
  defaultMessage: 'Investigation sections',
});
export const SHOW_SIDE_PANEL = i18n.translate('xpack.cases.investigations.detail.showSidePanel', {
  defaultMessage: 'Show side panel',
});

export const SIDE_PANEL_LABEL = i18n.translate('xpack.cases.investigations.detail.sidePanelLabel', {
  defaultMessage: 'Side panel',
});
export const HIDE_SIDE_PANEL = i18n.translate('xpack.cases.investigations.detail.hideSidePanel', {
  defaultMessage: 'Hide side panel',
});
export const SIDE_MODE_LEGEND = i18n.translate('xpack.cases.investigations.detail.sideModeLegend', {
  defaultMessage: 'Side panel content',
});
export const CONTEXT = i18n.translate('xpack.cases.investigations.detail.context', {
  defaultMessage: 'Context',
});
export const CHAT = i18n.translate('xpack.cases.investigations.detail.chat', {
  defaultMessage: 'Chat',
});
export const CHAT_COMING = i18n.translate('xpack.cases.investigations.detail.chatComing', {
  defaultMessage: 'Chat coming',
});

export const AT_A_GLANCE = i18n.translate('xpack.cases.investigations.detail.atAGlance', {
  defaultMessage: 'At a glance',
});
export const GLANCE_EVIDENCE = i18n.translate('xpack.cases.investigations.detail.glanceEvidence', {
  defaultMessage: 'Evidence',
});
export const GLANCE_CLAIMS = i18n.translate('xpack.cases.investigations.detail.glanceClaims', {
  defaultMessage: 'Claims',
});
export const GLANCE_PROCEDURE = i18n.translate(
  'xpack.cases.investigations.detail.glanceProcedure',
  { defaultMessage: 'Procedure' }
);
export const GLANCE_CONVERSATION = i18n.translate(
  'xpack.cases.investigations.detail.glanceConversation',
  { defaultMessage: 'Conversation' }
);
export const EVIDENCE_ITEMS = (count: number) =>
  i18n.translate('xpack.cases.investigations.detail.evidenceItems', {
    defaultMessage: '{count, plural, one {# item} other {# items}}',
    values: { count },
  });
export const CLAIMS_SUMMARY = (total: number, open: number) =>
  i18n.translate('xpack.cases.investigations.detail.claimsSummary', {
    defaultMessage: '{total} ({open} open)',
    values: { total, open },
  });
export const PROCEDURE_DONE = (done: number, total: number) =>
  i18n.translate('xpack.cases.investigations.detail.procedureDone', {
    defaultMessage: '{done}/{total} done',
    values: { done, total },
  });
export const CONVERSATION_MESSAGES = (count: number) =>
  i18n.translate('xpack.cases.investigations.detail.conversationMessages', {
    defaultMessage: '{count, plural, one {# message} other {# messages}}',
    values: { count },
  });

export const FIELDS = i18n.translate('xpack.cases.investigations.detail.fields', {
  defaultMessage: 'Fields',
});
export const FIELDS_SEARCHABLE = i18n.translate(
  'xpack.cases.investigations.detail.fieldsSearchable',
  { defaultMessage: 'Searchable and reportable' }
);
export const INVESTIGATION_TYPE = i18n.translate(
  'xpack.cases.investigations.detail.investigationType',
  { defaultMessage: 'Investigation type' }
);
export const FIELDS_HELP = i18n.translate('xpack.cases.investigations.detail.fieldsHelp', {
  defaultMessage:
    'The type sets the procedure and its required tasks. People and agents can both write these fields. Changes appear in Activity.',
});
export const FIELD_EMPTY = i18n.translate('xpack.cases.investigations.detail.fieldEmpty', {
  defaultMessage: 'Empty',
});
export const FIELD_DATE_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.detail.fieldDatePlaceholder',
  { defaultMessage: 'Date and time, for example 2026-11-20T14:00:00Z' }
);
export const FIELD_NO_OPTION = i18n.translate('xpack.cases.investigations.detail.fieldNoOption', {
  defaultMessage: 'Not set',
});
export const FIELD_NUMBER_INVALID = i18n.translate(
  'xpack.cases.investigations.detail.fieldNumberInvalid',
  { defaultMessage: 'Enter a number.' }
);
export const FIELD_DATE_INVALID = i18n.translate(
  'xpack.cases.investigations.detail.fieldDateInvalid',
  { defaultMessage: 'Enter a valid date and time.' }
);
export const FIELDS_LOADING_TYPES = i18n.translate(
  'xpack.cases.investigations.detail.fieldsLoadingTypes',
  { defaultMessage: 'Loading investigation types' }
);

export const RELATED = i18n.translate('xpack.cases.investigations.detail.related', {
  defaultMessage: 'Related investigations',
});
export const RELATED_NONE = i18n.translate('xpack.cases.investigations.detail.relatedNone', {
  defaultMessage: 'No related investigations found.',
});
export const RELATED_ERROR = i18n.translate('xpack.cases.investigations.detail.relatedError', {
  defaultMessage: 'Could not load related investigations.',
});
export const WHY_SIMILAR = (reasons: string) =>
  i18n.translate('xpack.cases.investigations.detail.whySimilar', {
    defaultMessage: 'Why similar: {reasons}',
    values: { reasons },
  });
export const VIEW_DETAILS = i18n.translate('xpack.cases.investigations.detail.viewDetails', {
  defaultMessage: 'View details',
});
export const OPEN_DETAILS_FOR = (displayId: string) =>
  i18n.translate('xpack.cases.investigations.detail.openDetailsFor', {
    defaultMessage: 'Open details for {displayId}',
    values: { displayId },
  });
export const REASON_ENTITY = (value: string) =>
  i18n.translate('xpack.cases.investigations.detail.reasonEntity', {
    defaultMessage: 'Same entity, {value}',
    values: { value },
  });
export const REASON_INDICATOR = (value: string) =>
  i18n.translate('xpack.cases.investigations.detail.reasonIndicator', {
    defaultMessage: 'Same indicator, {value}',
    values: { value },
  });
export const REASON_ALERT = (value: string) =>
  i18n.translate('xpack.cases.investigations.detail.reasonAlert', {
    defaultMessage: 'Same alert, {value}',
    values: { value },
  });
export const REASON_MERGED = (value: string) =>
  i18n.translate('xpack.cases.investigations.detail.reasonMerged', {
    defaultMessage: 'Merged with {value}',
    values: { value },
  });
export const REASON_NONE = i18n.translate('xpack.cases.investigations.detail.reasonNone', {
  defaultMessage: 'Similar activity',
});
export const REASONS_MORE = (count: number) =>
  i18n.translate('xpack.cases.investigations.detail.reasonsMore', {
    defaultMessage: '+{count} more',
    values: { count },
  });

export const FLYOUT_ASSIGNEES = i18n.translate(
  'xpack.cases.investigations.detail.flyoutAssignees',
  {
    defaultMessage: 'Assignees',
  }
);
export const FLYOUT_STARTED_BY = i18n.translate(
  'xpack.cases.investigations.detail.flyoutStartedBy',
  { defaultMessage: 'Started by' }
);
export const FLYOUT_CREATED = i18n.translate('xpack.cases.investigations.detail.flyoutCreated', {
  defaultMessage: 'Created',
});
export const FLYOUT_UPDATED = i18n.translate('xpack.cases.investigations.detail.flyoutUpdated', {
  defaultMessage: 'Updated',
});
export const FLYOUT_ALERTS = i18n.translate('xpack.cases.investigations.detail.flyoutAlerts', {
  defaultMessage: 'Alerts',
});
export const FLYOUT_WHY_RELATED = (displayId: string) =>
  i18n.translate('xpack.cases.investigations.detail.flyoutWhyRelated', {
    defaultMessage: 'Why it is related to {displayId}',
    values: { displayId },
  });
export const FLYOUT_OUTCOME = i18n.translate('xpack.cases.investigations.detail.flyoutOutcome', {
  defaultMessage: 'Outcome',
});
export const FLYOUT_OUTCOME_TEXT = (verdict: string, reason: string, rootCause: string) =>
  i18n.translate('xpack.cases.investigations.detail.flyoutOutcomeText', {
    defaultMessage: 'Closed as {verdict}. Reason: {reason}. Root cause: {rootCause}.',
    values: { verdict, reason, rootCause },
  });
export const FLYOUT_SUMMARY = i18n.translate('xpack.cases.investigations.detail.flyoutSummary', {
  defaultMessage: 'Summary',
});
export const FLYOUT_SHARED_ENTITIES = i18n.translate(
  'xpack.cases.investigations.detail.flyoutSharedEntities',
  { defaultMessage: 'Shared with this investigation' }
);
export const FLYOUT_CLOSE = i18n.translate('xpack.cases.investigations.detail.flyoutClose', {
  defaultMessage: 'Close',
});
export const FLYOUT_OPEN_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.detail.flyoutOpenInvestigation',
  { defaultMessage: 'Open investigation' }
);
export const FLYOUT_ARIA_LABEL = (displayId: string) =>
  i18n.translate('xpack.cases.investigations.detail.flyoutAriaLabel', {
    defaultMessage: 'Investigation {displayId}',
    values: { displayId },
  });

export const RECENT_ACTIVITY = i18n.translate('xpack.cases.investigations.detail.recentActivity', {
  defaultMessage: 'Recent activity',
});
export const RECENT_ACTIVITY_NONE = i18n.translate(
  'xpack.cases.investigations.detail.recentActivityNone',
  { defaultMessage: 'No activity yet.' }
);
export const RECENT_ACTIVITY_ERROR = i18n.translate(
  'xpack.cases.investigations.detail.recentActivityError',
  { defaultMessage: 'Could not load recent activity.' }
);
export const VIEW_ALL = i18n.translate('xpack.cases.investigations.detail.viewAll', {
  defaultMessage: 'View all',
});

export const NOT_FOUND_TITLE = i18n.translate('xpack.cases.investigations.detail.notFoundTitle', {
  defaultMessage: 'Investigation not found',
});
export const NOT_FOUND_BODY = i18n.translate('xpack.cases.investigations.detail.notFoundBody', {
  defaultMessage: 'It may have been merged or removed, or the link may be wrong.',
});
export const FORBIDDEN_TITLE = i18n.translate('xpack.cases.investigations.detail.forbiddenTitle', {
  defaultMessage: 'You do not have access to this investigation',
});
export const FORBIDDEN_BODY = i18n.translate('xpack.cases.investigations.detail.forbiddenBody', {
  defaultMessage: 'Ask the owner or an administrator to give you access.',
});
export const LOAD_ERROR_TITLE = i18n.translate('xpack.cases.investigations.detail.loadErrorTitle', {
  defaultMessage: 'Could not load the investigation',
});
export const BACK_TO_QUEUE = i18n.translate('xpack.cases.investigations.detail.backToQueue', {
  defaultMessage: 'Back to investigations',
});
export const LOADING_INVESTIGATION = i18n.translate(
  'xpack.cases.investigations.detail.loadingInvestigation',
  { defaultMessage: 'Loading investigation' }
);
