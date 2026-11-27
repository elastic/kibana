/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MERGE_CASES = i18n.translate('xpack.cases.mergeCases.bulkAction', {
  defaultMessage: 'Merge cases',
});

export const DISABLED_TOO_FEW = (min: number) =>
  i18n.translate('xpack.cases.mergeCases.bulkAction.tooFew', {
    defaultMessage: 'Select at least {min} cases to merge.',
    values: { min },
  });

export const DISABLED_TOO_MANY = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.bulkAction.tooMany', {
    defaultMessage: 'Select {max} or fewer cases to merge.',
    values: { max },
  });

export const DISABLED_MIXED_OWNERS = i18n.translate(
  'xpack.cases.mergeCases.bulkAction.mixedOwners',
  { defaultMessage: 'Select cases from one solution to merge them.' }
);

export const FLYOUT_TITLE = i18n.translate('xpack.cases.mergeCases.flyout.title', {
  defaultMessage: 'Merge cases',
});

export const CASES_COUNTER = (count: number, max: number) =>
  i18n.translate('xpack.cases.mergeCases.casesCounter', {
    defaultMessage: '{count} of {max} cases',
    values: { count, max },
  });

export const CASE_COLUMN = i18n.translate('xpack.cases.mergeCases.caseColumn', {
  defaultMessage: 'Case',
});

export const ALERTS_COLUMN = i18n.translate('xpack.cases.mergeCases.alertsColumn', {
  defaultMessage: 'Alerts',
});

export const REMOVE_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.removeCase', {
    defaultMessage: 'Remove {caseRef} from this merge',
    values: { caseRef },
  });

export const TITLE_FIELD = i18n.translate('xpack.cases.mergeCases.field.title', {
  defaultMessage: 'Title',
});

export const SEVERITY_FIELD = i18n.translate('xpack.cases.mergeCases.field.severity', {
  defaultMessage: 'Severity',
});

export const STATUS_FIELD = i18n.translate('xpack.cases.mergeCases.field.status', {
  defaultMessage: 'Status',
});

export const DESCRIPTION_FIELD = i18n.translate('xpack.cases.mergeCases.field.description', {
  defaultMessage: 'Description',
});

export const CATEGORY_FIELD = i18n.translate('xpack.cases.mergeCases.field.category', {
  defaultMessage: 'Category',
});

export const TAGS_FIELD = i18n.translate('xpack.cases.mergeCases.field.tags', {
  defaultMessage: 'Tags',
});

export const ASSIGNEES_FIELD = i18n.translate('xpack.cases.mergeCases.field.assignees', {
  defaultMessage: 'Assignees',
});

export const CONNECTOR_FIELD = i18n.translate('xpack.cases.mergeCases.field.connector', {
  defaultMessage: 'Connector',
});

export const TEMPLATE_FIELD = i18n.translate('xpack.cases.mergeCases.field.template', {
  defaultMessage: 'Template',
});

export const NO_TEMPLATE = i18n.translate('xpack.cases.mergeCases.noTemplate', {
  defaultMessage: 'No template',
});

export const NO_CONNECTOR = i18n.translate('xpack.cases.mergeCases.noConnector', {
  defaultMessage: 'No connector',
});

export const NOT_SET = i18n.translate('xpack.cases.mergeCases.provenance.none', {
  defaultMessage: 'Not set in any case',
});

export const TEMPLATE_DEFAULT = i18n.translate(
  'xpack.cases.mergeCases.provenance.templateDefault',
  { defaultMessage: "Template's default" }
);

export const EMPTY_VALUE = i18n.translate('xpack.cases.mergeCases.emptyValue', {
  defaultMessage: 'None',
});

export const EDIT = i18n.translate('xpack.cases.mergeCases.edit', {
  defaultMessage: 'Edit',
});

export const EDIT_FIELD_ARIA_LABEL = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.editFieldAriaLabel', {
    defaultMessage: 'Edit {field}',
    values: { field },
  });

export const COMBINED_DESCRIPTION_HEADING = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.combinedDescriptionHeading', {
    defaultMessage: 'From {caseRef}',
    values: { caseRef },
  });

export const ASSIGNEES_OVER_LIMIT = (max: number, count: number) =>
  i18n.translate('xpack.cases.mergeCases.assigneesOverLimit', {
    defaultMessage: 'A case can have up to {max} assignees. Remove {count} to merge.',
    values: { max, count },
  });

export const ALERTS = i18n.translate('xpack.cases.mergeCases.attachments.alerts', {
  defaultMessage: 'Alerts',
});

export const EVENTS = i18n.translate('xpack.cases.mergeCases.attachments.events', {
  defaultMessage: 'Events',
});

export const OBSERVABLES = i18n.translate('xpack.cases.mergeCases.attachments.observables', {
  defaultMessage: 'Observables',
});

export const OTHER_ATTACHMENTS = i18n.translate('xpack.cases.mergeCases.attachments.other', {
  defaultMessage: 'Other attachments',
});

export const ATTACKS = i18n.translate('xpack.cases.mergeCases.attachments.attacks', {
  defaultMessage: 'Attacks',
});

export const NOT_COPIED_ALERT_CASE_LIMIT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.notCopiedAlertCaseLimit', {
    defaultMessage:
      '{count, plural, one {# alert is already in 10 cases and stays} other {# alerts are already in 10 cases and stay}} on the source cases.',
    values: { count },
  });

export const NOT_COPIED_ALERT_NOT_AUTHORIZED = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.notCopiedAlertNotAuthorized', {
    defaultMessage:
      "You can't update {count, plural, one {# alert} other {# alerts}}, so {count, plural, one {it stays} other {they stay}} on the source cases.",
    values: { count },
  });

export const NOT_COPIED_LICENSE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.notCopiedLicense', {
    defaultMessage:
      'Copying observables needs a Platinum license. {count, plural, one {# observable stays} other {# observables stay}} on the source cases.',
    values: { count },
  });

export const TO_COPY = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.toCopy', {
    defaultMessage: '{count} to copy',
    values: { count },
  });

export const DUPLICATES_SKIPPED = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.duplicatesSkipped', {
    defaultMessage: '{count, plural, one {# duplicate} other {# duplicates}} skipped',
    values: { count },
  });

export const ALREADY_IN_DESTINATION = (count: number, caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.attachments.alreadyInDestination', {
    defaultMessage: '{count} already in {caseRef}',
    values: { count, caseRef },
  });

export const OVER_LIMIT_BADGE = (count: number, max: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.overLimitBadge', {
    defaultMessage: '{count} of {max}',
    values: { count, max },
  });

export const LEFT_OUT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.leftOut', {
    defaultMessage: '{count} left out',
    values: { count },
  });

export const CHOICES_SELECTED = (selected: number, total: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.selected', {
    defaultMessage: '{selected} of {total} selected',
    values: { selected, total },
  });

export const CHOICES_WITHIN_LIMIT = i18n.translate('xpack.cases.mergeCases.choices.withinLimit', {
  defaultMessage: 'Within the limit.',
});

export const KEEP_NEWEST = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.keepNewest', {
    defaultMessage: 'Keep the newest {count}',
    values: { count },
  });

export const CHOICES_SELECT_ALL = i18n.translate('xpack.cases.mergeCases.choices.selectAll', {
  defaultMessage: 'Select all',
});

export const CHOICES_INCLUDE = (item: string) =>
  i18n.translate('xpack.cases.mergeCases.choices.include', {
    defaultMessage: 'Copy {item}',
    values: { item },
  });

export const CHOICES_INCLUDE_RULE = (rule: string) =>
  i18n.translate('xpack.cases.mergeCases.choices.includeRule', {
    defaultMessage: 'Copy the alerts from {rule}',
    values: { rule },
  });

export const CHOICES_SHOW_RULE_ALERTS = (rule: string) =>
  i18n.translate('xpack.cases.mergeCases.choices.showRuleAlerts', {
    defaultMessage: 'Show the alerts from {rule}',
    values: { rule },
  });

export const CHOICES_HIDE_RULE_ALERTS = (rule: string) =>
  i18n.translate('xpack.cases.mergeCases.choices.hideRuleAlerts', {
    defaultMessage: 'Hide the alerts from {rule}',
    values: { rule },
  });

export const CHOICES_ALERTS_BY_RULE = i18n.translate(
  'xpack.cases.mergeCases.choices.alertsByRule',
  { defaultMessage: 'Alerts by rule' }
);

export const UNKNOWN_RULE = i18n.translate('xpack.cases.mergeCases.choices.unknownRule', {
  defaultMessage: 'Unknown rule',
});

export const RULE_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.ruleColumn', {
  defaultMessage: 'Rule',
});

export const ALERT_ID_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.alertIdColumn', {
  defaultMessage: 'Alert ID',
});

export const EVENT_ID_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.eventIdColumn', {
  defaultMessage: 'Event ID',
});

export const INDEX_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.indexColumn', {
  defaultMessage: 'Index',
});

export const TYPE_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.typeColumn', {
  defaultMessage: 'Type',
});

export const VALUE_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.valueColumn', {
  defaultMessage: 'Value',
});

export const FROM_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.fromColumn', {
  defaultMessage: 'From',
});

export const ADDED_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.addedColumn', {
  defaultMessage: 'Added',
});

export const ATTACK_COLUMN = i18n.translate('xpack.cases.mergeCases.choices.attackColumn', {
  defaultMessage: 'Attack',
});

export const ALERT_COUNT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.alertCount', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });
export const UNTITLED_ATTACK = i18n.translate('xpack.cases.mergeCases.choices.untitledAttack', {
  defaultMessage: 'Untitled attack',
});

export const ATTACKS_HELP = i18n.translate('xpack.cases.mergeCases.choices.attacksHelp', {
  defaultMessage: 'An attack is copied or left out with the alerts it brought.',
});

export const COUNTS_TOWARD_LIMIT = i18n.translate(
  'xpack.cases.mergeCases.choices.countsTowardLimit',
  { defaultMessage: 'Counts toward the limit' }
);

export const NO_ATTACHMENTS = i18n.translate('xpack.cases.mergeCases.attachments.none', {
  defaultMessage: 'No attachments to copy.',
});

export const CLOSE_SOURCES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.closeSources', {
    defaultMessage: 'Close the {count, plural, one {source case} other {# source cases}}',
    values: { count },
  });

export const CANCEL = i18n.translate('xpack.cases.mergeCases.cancel', {
  defaultMessage: 'Cancel',
});

export const MERGING = i18n.translate('xpack.cases.mergeCases.merging', {
  defaultMessage: 'Merging...',
});

export const LOADING_CASES = i18n.translate('xpack.cases.mergeCases.loadingCases', {
  defaultMessage: 'Loading cases...',
});

export const BLOCKED_ADD_ANOTHER_CASE = i18n.translate(
  'xpack.cases.mergeCases.blocked.addAnotherCase',
  { defaultMessage: 'Add another case to merge' }
);

export const BLOCKED_NO_DESTINATION = i18n.translate(
  'xpack.cases.mergeCases.blocked.noDestination',
  { defaultMessage: 'Add an open case to merge into' }
);

export const BLOCKED_FILL_IN_FIELD = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.blocked.fillInField', {
    defaultMessage: 'Fill in {field} to continue',
    values: { field },
  });

export const BLOCKED_LEAVE_OUT_ALERTS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.leaveOutAlerts', {
    defaultMessage: 'Leave out {count, plural, one {# alert} other {# alerts}} to continue',
    values: { count },
  });

export const BLOCKED_LEAVE_OUT_OBSERVABLES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.leaveOutObservables', {
    defaultMessage:
      'Leave out {count, plural, one {# observable} other {# observables}} to continue',
    values: { count },
  });

export const BLOCKED_LEAVE_OUT_OTHER = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.leaveOutOther', {
    defaultMessage:
      'Leave out {count, plural, one {# attachment} other {# attachments}} to continue',
    values: { count },
  });

export const OPEN_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.openCase', {
    defaultMessage: 'Open case {caseRef}',
    values: { caseRef },
  });

export const OPEN_CASE_IN_NEW_TAB = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.openCaseInNewTab', {
    defaultMessage: 'Open case {caseRef} in a new tab',
    values: { caseRef },
  });

export const SUCCESS_TOAST = (count: number, caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.successToast', {
    defaultMessage: 'Merged {count, plural, one {# case} other {# cases}} into {caseRef}',
    values: { count, caseRef },
  });

export const PARTIAL_TOAST_TITLE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.partialToastTitle', {
    defaultMessage: "Merged into {caseRef}, but some changes weren't made",
    values: { caseRef },
  });

export const PARTIAL_NOT_MERGED_BODY = (count: number, caseRefs: string, caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.partialNotMergedBody', {
    defaultMessage:
      "{caseRefs} {count, plural, one {wasn't} other {weren't}} merged. {count, plural, one {Its items stay on it} other {Their items stay on them}}; merge {count, plural, one {it} other {them}} into {caseRef} again to finish.",
    values: { count, caseRefs, caseRef },
  });

export const PARTIAL_STEPS_BODY = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.partialStepsBody', {
    defaultMessage:
      "Every case was merged, but the activity entries weren't all added. Check the activity of {caseRef}.",
    values: { caseRef },
  });

export const FAILURE_TOAST_TITLE = i18n.translate('xpack.cases.mergeCases.failureToastTitle', {
  defaultMessage: "We couldn't merge these cases",
});

export const FAILURE_TOAST_BODY = i18n.translate('xpack.cases.mergeCases.failureToastBody', {
  defaultMessage:
    'No cases were changed. Try again. If this keeps happening, contact your administrator.',
});

export const MERGE_WITH_OTHER_CASES = i18n.translate('xpack.cases.mergeCases.mergeWithOtherCases', {
  defaultMessage: 'Merge with other cases',
});

export const ADD_CASES = i18n.translate('xpack.cases.mergeCases.addCases', {
  defaultMessage: 'Add cases',
});

export const ADD_CASES_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.addCasesLimit', {
    defaultMessage: 'You can merge up to {max} cases at once.',
    values: { max },
  });

export const ADD_CASES_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.cases.mergeCases.addCasesSearchPlaceholder',
  {
    defaultMessage: 'Search by #number or title',
  }
);

export const ADD_CASES_NONE = i18n.translate('xpack.cases.mergeCases.addCasesNone', {
  defaultMessage: 'No cases found.',
});

export const ADD_CASES_NO_MATCHES = i18n.translate('xpack.cases.mergeCases.addCasesNoMatches', {
  defaultMessage: 'No cases match your search.',
});

export const ADD_CASES_ERROR = i18n.translate('xpack.cases.mergeCases.addCasesError', {
  defaultMessage: "Couldn't load cases. Close this list and try again.",
});

export const NEW_CASE_NO_PERMISSION = i18n.translate('xpack.cases.mergeCases.newCaseNoPermission', {
  defaultMessage: "You can't create cases, so merge into one of the open cases.",
});

export const DISCARD_TITLE = i18n.translate('xpack.cases.mergeCases.discardTitle', {
  defaultMessage: 'Discard your merge changes?',
});

export const DISCARD_CONFIRM = i18n.translate('xpack.cases.mergeCases.discardConfirm', {
  defaultMessage: 'Discard',
});

export const KEEP_EDITING = i18n.translate('xpack.cases.mergeCases.keepEditing', {
  defaultMessage: 'Keep editing',
});

export const CASES_CHANGED_TITLE = i18n.translate('xpack.cases.mergeCases.casesChangedTitle', {
  defaultMessage: 'The cases changed',
});

export const CASES_CHANGED_BODY = i18n.translate('xpack.cases.mergeCases.casesChangedBody', {
  defaultMessage:
    'The preview was refreshed. Review the fields marked to resolve, then merge again.',
});

export const STEP_CASES = i18n.translate('xpack.cases.mergeCases.step.cases', {
  defaultMessage: 'Cases',
});

export const STEP_DIFFERENCES = i18n.translate('xpack.cases.mergeCases.step.differences', {
  defaultMessage: 'Conflicts',
});

export const STEP_ATTACHMENTS = i18n.translate('xpack.cases.mergeCases.step.attachments', {
  defaultMessage: 'Attachments',
});

export const STEP_REVIEW = i18n.translate('xpack.cases.mergeCases.step.review', {
  defaultMessage: 'Review',
});

export const STEPS_ARIA_LABEL = i18n.translate('xpack.cases.mergeCases.step.ariaLabel', {
  defaultMessage: 'Merge steps',
});

export const NEXT = i18n.translate('xpack.cases.mergeCases.next', {
  defaultMessage: 'Next',
});

export const BACK = i18n.translate('xpack.cases.mergeCases.back', {
  defaultMessage: 'Back',
});

export const MERGE = i18n.translate('xpack.cases.mergeCases.merge', {
  defaultMessage: 'Merge',
});

export const BLOCKED_CHANGE_FIELD = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.blocked.changeField', {
    defaultMessage: 'Change {field} to continue',
    values: { field },
  });

export const BLOCKED_FIX_LIMIT = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.blocked.fixLimit', {
    defaultMessage: 'Bring {field} within its limit to continue',
    values: { field },
  });

export const BLOCKED_ON_STEP = (step: string) =>
  i18n.translate('xpack.cases.mergeCases.blocked.onStep', {
    defaultMessage: 'Something changed on {step}. Go back to it to merge.',
    values: { step },
  });

export const MERGE_INTO_LEGEND = i18n.translate(
  'xpack.cases.mergeCases.casesStep.mergeIntoLegend',
  {
    defaultMessage: 'Merge into',
  }
);

export const MERGE_INTO_NEW_TITLE = i18n.translate(
  'xpack.cases.mergeCases.casesStep.mergeIntoNewTitle',
  { defaultMessage: 'Merge into a new case' }
);

export const MERGE_INTO_NEW_DESCRIPTION = i18n.translate(
  'xpack.cases.mergeCases.casesStep.mergeIntoNewDescription',
  { defaultMessage: 'Starts a new case with their attachments.' }
);

export const MERGE_INTO_EXISTING_TITLE = i18n.translate(
  'xpack.cases.mergeCases.casesStep.mergeIntoExistingTitle',
  { defaultMessage: 'Merge into an existing case' }
);

export const MERGE_INTO_EXISTING_DESCRIPTION = i18n.translate(
  'xpack.cases.mergeCases.casesStep.mergeIntoExistingDescription',
  { defaultMessage: "Adds the others' attachments to the case you choose." }
);

export const MERGE_INTO_EXISTING_NONE_OPEN = i18n.translate(
  'xpack.cases.mergeCases.casesStep.mergeIntoExistingNoneOpen',
  { defaultMessage: 'All the cases are closed. Reopen one to merge into it.' }
);

export const CASES_TO_MERGE = i18n.translate('xpack.cases.mergeCases.casesStep.casesToMerge', {
  defaultMessage: 'Cases to merge',
});

export const CHOOSE_CASE_TO_MERGE_INTO = i18n.translate(
  'xpack.cases.mergeCases.casesStep.chooseCaseToMergeInto',
  { defaultMessage: 'Choose the case to merge into' }
);

export const BLOCKED_CHOOSE_CASE_TO_MERGE_INTO = i18n.translate(
  'xpack.cases.mergeCases.blocked.chooseCaseToMergeInto',
  { defaultMessage: 'Choose the case to merge into' }
);

export const CLOSED_CASE_CANNOT_KEEP = i18n.translate(
  'xpack.cases.mergeCases.casesStep.closedCaseCannotKeep',
  { defaultMessage: 'Reopen it to merge into it. It can still be merged in.' }
);

export const FACT_STATUS = i18n.translate('xpack.cases.mergeCases.casesStep.factStatus', {
  defaultMessage: 'Status',
});

export const FACT_SEVERITY = i18n.translate('xpack.cases.mergeCases.casesStep.factSeverity', {
  defaultMessage: 'Severity',
});

export const FACT_ALERTS = i18n.translate('xpack.cases.mergeCases.casesStep.factAlerts', {
  defaultMessage: 'Alerts',
});

export const FACT_OPENED = i18n.translate('xpack.cases.mergeCases.casesStep.factOpened', {
  defaultMessage: 'Opened',
});

export const FACT_CLOSED = i18n.translate('xpack.cases.mergeCases.casesStep.factClosed', {
  defaultMessage: 'Closed',
});

export const LEAVE_OUT_BY = i18n.translate('xpack.cases.mergeCases.attachmentsStep.leaveOutBy', {
  defaultMessage: 'Leave out alerts',
});

export const BY_RULE = i18n.translate('xpack.cases.mergeCases.attachmentsStep.byRule', {
  defaultMessage: 'By rule',
});

export const BY_CASE = i18n.translate('xpack.cases.mergeCases.attachmentsStep.byCase', {
  defaultMessage: 'By case',
});

export const KEEP_NEWEST_RESULT = (count: number, left: number) =>
  i18n.translate('xpack.cases.mergeCases.attachmentsStep.keepNewestResult', {
    defaultMessage:
      'Keeps the {count} alerts most recently added to a case. {left, plural, one {# alert stays} other {# alerts stay}} on the source cases.',
    values: { count, left },
  });

export const KEEP_NEWEST_UP_TO_LIMITS = i18n.translate(
  'xpack.cases.mergeCases.attachmentsStep.keepNewestUpToLimits',
  { defaultMessage: 'Keep the newest up to each limit' }
);

export const OVER_LIMITS_HINT = i18n.translate(
  'xpack.cases.mergeCases.attachmentsStep.overLimitsHint',
  { defaultMessage: 'Some attachments are over a limit. Uncheck items below, or keep the newest.' }
);

export const WITHIN_LIMITS = i18n.translate('xpack.cases.mergeCases.attachmentsStep.withinLimits', {
  defaultMessage: 'Every attachment is within its limit.',
});

export const ALERTS_OVER_LIMIT_INLINE = (total: number, max: number, overBy: number) =>
  i18n.translate('xpack.cases.mergeCases.attachmentsStep.alertsOverLimit', {
    defaultMessage:
      'The cases hold {total} alerts and a case holds {max}. Leave out {overBy} more.',
    values: { total, max, overBy },
  });

export const KIND_OVER_LIMIT_INLINE = (kind: string, total: number, max: number, overBy: number) =>
  i18n.translate('xpack.cases.mergeCases.attachmentsStep.kindOverLimit', {
    defaultMessage:
      'The cases hold {total} {kind, select, observables {observables} other {other attachments}} and a case holds {max}. Leave out {overBy} more.',
    values: { kind, total, max, overBy },
  });

export const COPY_CASE_ALERTS = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.attachmentsStep.copyCaseAlerts', {
    defaultMessage: 'Copy the alerts from {caseRef}',
    values: { caseRef },
  });

export const ALERTS_BY_CASE = i18n.translate(
  'xpack.cases.mergeCases.attachmentsStep.alertsByCase',
  {
    defaultMessage: 'Alerts by case',
  }
);

export const FILES_AND_COMMENTS = i18n.translate(
  'xpack.cases.mergeCases.attachmentsStep.filesAndComments',
  { defaultMessage: 'Files and comments' }
);

export const FILES_AND_COMMENTS_STAY = (files: number, comments: number) =>
  i18n.translate('xpack.cases.mergeCases.attachmentsStep.filesAndCommentsStay', {
    defaultMessage:
      '{files, plural, one {# file} other {# files}} and {comments, plural, one {# comment} other {# comments}} stay on the source cases',
    values: { files, comments },
  });

export const FILES_COLUMN = i18n.translate('xpack.cases.mergeCases.attachmentsStep.filesColumn', {
  defaultMessage: 'Files',
});

export const COMMENTS_COLUMN = i18n.translate(
  'xpack.cases.mergeCases.attachmentsStep.commentsColumn',
  { defaultMessage: 'Comments' }
);

export const ALERTS_WITH_ATTACKS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachmentsStep.alertsWithAttacks', {
    defaultMessage:
      '{count, plural, one {# more alert comes} other {# more alerts come}} with the attacks below.',
    values: { count },
  });

export const PREVIEW_ARIA_LABEL = i18n.translate('xpack.cases.mergeCases.review.previewAriaLabel', {
  defaultMessage: 'Preview of the merged case',
});

export const PREVIEW = i18n.translate('xpack.cases.mergeCases.review.preview', {
  defaultMessage: 'Preview',
});

export const PREVIEW_TRAIL_NEW_CASE = i18n.translate(
  'xpack.cases.mergeCases.review.previewTrailNewCase',
  { defaultMessage: 'Cases / New case' }
);

export const PREVIEW_TRAIL_EXISTING_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.review.previewTrailExistingCase', {
    defaultMessage: 'Cases / {caseRef}',
    values: { caseRef },
  });

export const SHOW_ORIGINS = i18n.translate('xpack.cases.mergeCases.review.showOrigins', {
  defaultMessage: 'Show where values come from',
});

export const SHOW_ALL = i18n.translate('xpack.cases.mergeCases.review.showAll', {
  defaultMessage: 'Show all',
});

export const SHOW_LESS = i18n.translate('xpack.cases.mergeCases.review.showLess', {
  defaultMessage: 'Show less',
});

export const FROM = i18n.translate('xpack.cases.mergeCases.review.from', {
  defaultMessage: 'From',
});

export const YOUR_OWN_VALUE = i18n.translate('xpack.cases.mergeCases.review.yourOwnValue', {
  defaultMessage: 'Your own value',
});

export const COMBINED_FROM = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.review.combinedFrom', {
    defaultMessage: 'Combined from {count, plural, one {# case} other {# cases}}',
    values: { count },
  });

export const NOT_SET_IN_ANY_CASE = i18n.translate('xpack.cases.mergeCases.review.notSet', {
  defaultMessage: 'Not set',
});

export const MERGED_ATTACHMENT_COUNTS = (
  alerts: number,
  observables: number,
  events: number,
  other: number
) =>
  i18n.translate('xpack.cases.mergeCases.review.attachmentCounts', {
    defaultMessage:
      'The merged case will have {alerts, plural, one {# alert} other {# alerts}}, {observables, plural, one {# observable} other {# observables}}, {events, plural, one {# event} other {# events}} and {other, plural, one {# other attachment} other {# other attachments}}.',
    values: { alerts, observables, events, other },
  });

export const MORE_ITEMS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.review.moreItems', {
    defaultMessage: '+{count}',
    values: { count },
  });

export const SOURCE_CASES = i18n.translate('xpack.cases.mergeCases.review.sourceCases', {
  defaultMessage: 'Source cases',
});

export const SOURCES_KEEP_INFO = i18n.translate('xpack.cases.mergeCases.review.sourcesKeepInfo', {
  defaultMessage: 'What the source cases keep',
});

export const SOURCES_CLOSE_SUMMARY = (close: number, alreadyClosed: number) =>
  i18n.translate('xpack.cases.mergeCases.review.sourcesCloseSummary', {
    defaultMessage:
      '{close, plural, =0 {None will close} other {# will close}}{alreadyClosed, plural, =0 {} one {, # is already closed} other {, # are already closed}}',
    values: { close, alreadyClosed },
  });

export const STAYS_CLOSED = i18n.translate('xpack.cases.mergeCases.review.staysClosed', {
  defaultMessage: 'Stays closed',
});

export const STAYS_AS_IS = i18n.translate('xpack.cases.mergeCases.review.staysAsIs', {
  defaultMessage: 'Stays as is',
});

export const BECOMES = i18n.translate('xpack.cases.mergeCases.review.becomes', {
  defaultMessage: 'becomes',
});

export const SHOW_MORE_CASES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.review.showMoreCases', {
    defaultMessage: 'Show {count, plural, one {# more case} other {# more cases}}',
    values: { count },
  });

export const SHOW_FEWER = i18n.translate('xpack.cases.mergeCases.review.showFewer', {
  defaultMessage: 'Show fewer',
});

export const SOURCES_KEEP = i18n.translate('xpack.cases.mergeCases.review.sourcesKeep', {
  defaultMessage:
    'Each keeps its comments, attachments, and history, and shows a "Merged into" badge linking to the merged case.',
});

export const OTHER_ATTACHMENTS_SHORT = i18n.translate('xpack.cases.mergeCases.review.otherTab', {
  defaultMessage: 'Other',
});

export const AI_NO_CONNECTOR_TITLE = i18n.translate('xpack.cases.mergeCases.ai.noConnectorTitle', {
  defaultMessage: 'No AI connector available',
});

export const AI_NO_CONNECTOR_BODY = i18n.translate('xpack.cases.mergeCases.ai.noConnectorBody', {
  defaultMessage:
    'Set up an AI connector in Stack Management to resolve conflicts with AI, or choose the values yourself.',
});

export const AI_RESOLVE_FAILED_TITLE = i18n.translate(
  'xpack.cases.mergeCases.ai.resolveFailedTitle',
  {
    defaultMessage: "Couldn't resolve the conflicts with AI",
  }
);
