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

export const FLYOUT_TITLE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.flyout.title', {
    defaultMessage: 'Merge {count, plural, one {# case} other {# cases}}',
    values: { count },
  });

export const FLYOUT_DESCRIPTION = i18n.translate('xpack.cases.mergeCases.flyout.description', {
  defaultMessage:
    'Alerts, events, attacks, and observables are copied into one case. Files, comments, and history stay on the source cases.',
});

export const MERGE_INTO = i18n.translate('xpack.cases.mergeCases.mergeInto', {
  defaultMessage: 'Merge into',
});

export const NEW_CASE = i18n.translate('xpack.cases.mergeCases.newCase', {
  defaultMessage: 'New case',
});

export const EXISTING_DESTINATION_HELP = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.existingDestinationHelp', {
    defaultMessage: '{caseRef} keeps its number and links. Its values are the defaults.',
    values: { caseRef },
  });

export const CLOSED_CASES_NOT_OFFERED = i18n.translate(
  'xpack.cases.mergeCases.closedCasesNotOffered',
  { defaultMessage: 'Closed cases can be merged, but not merged into.' }
);

export const CASES_SECTION = i18n.translate('xpack.cases.mergeCases.casesSection', {
  defaultMessage: 'Cases',
});

export const CASES_COUNTER = (count: number, max: number) =>
  i18n.translate('xpack.cases.mergeCases.casesCounter', {
    defaultMessage: '{count} of {max}',
    values: { count, max },
  });

export const CASE_COLUMN = i18n.translate('xpack.cases.mergeCases.caseColumn', {
  defaultMessage: 'Case',
});

export const STATUS_COLUMN = i18n.translate('xpack.cases.mergeCases.statusColumn', {
  defaultMessage: 'Status',
});

export const SEVERITY_COLUMN = i18n.translate('xpack.cases.mergeCases.severityColumn', {
  defaultMessage: 'Severity',
});

export const ALERTS_COLUMN = i18n.translate('xpack.cases.mergeCases.alertsColumn', {
  defaultMessage: 'Alerts',
});

export const REMOVE_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.removeCase', {
    defaultMessage: 'Remove {caseRef} from this merge',
    values: { caseRef },
  });

export const CASE_DETAILS_SECTION = i18n.translate('xpack.cases.mergeCases.caseDetailsSection', {
  defaultMessage: 'Case details',
});

export const CONFLICTS_TO_RESOLVE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.conflictsToResolve', {
    defaultMessage: '{count, plural, one {# conflict} other {# conflicts}} to resolve',
    values: { count },
  });

export const CONFLICTS_RESOLVED = i18n.translate('xpack.cases.mergeCases.conflictsResolved', {
  defaultMessage: 'Conflicts resolved',
});

export const NO_CONFLICTS = i18n.translate('xpack.cases.mergeCases.noConflicts', {
  defaultMessage: 'No conflicts',
});

export const TITLE_FIELD = i18n.translate('xpack.cases.mergeCases.field.title', {
  defaultMessage: 'Title',
});

export const SEVERITY_FIELD = i18n.translate('xpack.cases.mergeCases.field.severity', {
  defaultMessage: 'Severity',
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

export const TEMPLATE_DISABLED = i18n.translate('xpack.cases.mergeCases.templateDisabled', {
  defaultMessage: 'Disabled',
});

export const REQUIRED = i18n.translate('xpack.cases.mergeCases.required', {
  defaultMessage: 'Required',
});

export const TOGGLE_ON = i18n.translate('xpack.cases.mergeCases.toggleOn', {
  defaultMessage: 'On',
});

export const TOGGLE_OFF = i18n.translate('xpack.cases.mergeCases.toggleOff', {
  defaultMessage: 'Off',
});

export const NOT_COPIED_FIELDS = (fields: string) =>
  i18n.translate('xpack.cases.mergeCases.notCopiedFields', {
    defaultMessage:
      "Not copied, the destination's template doesn't define them. They stay on the source cases: {fields}",
    values: { fields },
  });

export const ASSIGNEES_UNAVAILABLE_LICENSE = i18n.translate(
  'xpack.cases.mergeCases.assigneesUnavailableLicense',
  { defaultMessage: 'Assignees need a Platinum license. The merge leaves them unchanged.' }
);

export const ASSIGNEES_UNAVAILABLE_PRIVILEGE = i18n.translate(
  'xpack.cases.mergeCases.assigneesUnavailablePrivilege',
  { defaultMessage: "You can't assign users. The merge leaves assignees unchanged." }
);

export const FROM_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.provenance.fromCase', {
    defaultMessage: 'From {caseRef}',
    values: { caseRef },
  });

export const FROM_CASES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.provenance.fromCases', {
    defaultMessage: 'From {count} cases',
    values: { count },
  });

export const HIGHEST = i18n.translate('xpack.cases.mergeCases.provenance.highest', {
  defaultMessage: 'Highest',
});

export const COMBINED = i18n.translate('xpack.cases.mergeCases.provenance.combined', {
  defaultMessage: 'Combined',
});

export const SAME_IN_ALL_CASES = i18n.translate('xpack.cases.mergeCases.provenance.same', {
  defaultMessage: 'Same in all cases',
});

export const NOT_SET = i18n.translate('xpack.cases.mergeCases.provenance.none', {
  defaultMessage: 'Not set in any case',
});

export const EDITED = i18n.translate('xpack.cases.mergeCases.provenance.edited', {
  defaultMessage: 'Edited',
});

export const MOST_USED = i18n.translate('xpack.cases.mergeCases.provenance.mostUsed', {
  defaultMessage: 'Used by most cases',
});

export const TEMPLATE_DEFAULT = i18n.translate(
  'xpack.cases.mergeCases.provenance.templateDefault',
  { defaultMessage: "Template's default" }
);

export const SUGGESTED = (provenance: string) =>
  i18n.translate('xpack.cases.mergeCases.provenance.suggested', {
    defaultMessage: 'Suggested: {provenance}',
    values: { provenance },
  });

export const EMPTY_VALUE = i18n.translate('xpack.cases.mergeCases.emptyValue', {
  defaultMessage: 'None',
});

export const CONFLICT_TRIGGER = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.conflictTrigger', {
    defaultMessage: '{count} values, choose one',
    values: { count },
  });

export const CHANGE_VALUE = i18n.translate('xpack.cases.mergeCases.changeValue', {
  defaultMessage: 'Change',
});

export const RESOLVED = i18n.translate('xpack.cases.mergeCases.resolved', {
  defaultMessage: 'Resolved',
});

export const USE_SUGGESTION = i18n.translate('xpack.cases.mergeCases.useSuggestion', {
  defaultMessage: 'Use suggestion',
});

export const USE_SUGGESTION_ARIA_LABEL = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.useSuggestionAriaLabel', {
    defaultMessage: 'Use the suggested {field}',
    values: { field },
  });

export const INVALID_VALUE = i18n.translate('xpack.cases.mergeCases.invalidValue', {
  defaultMessage: "The template doesn't accept this value. Choose another one or clear it.",
});

export const CONFLICT_ARIA_LABEL = (field: string, count: number) =>
  i18n.translate('xpack.cases.mergeCases.conflictAriaLabel', {
    defaultMessage: '{field} has {count} different values. Select the value to keep.',
    values: { field, count },
  });

export const POPOVER_TITLE_NEW_CASE = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.popoverTitleNewCase', {
    defaultMessage: '{field} for the new case',
    values: { field },
  });

export const POPOVER_TITLE_EXISTING_CASE = (field: string, caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.popoverTitleExistingCase', {
    defaultMessage: '{field} for {caseRef}',
    values: { field, caseRef },
  });

export const EDIT = i18n.translate('xpack.cases.mergeCases.edit', {
  defaultMessage: 'Edit',
});

export const DONE = i18n.translate('xpack.cases.mergeCases.done', {
  defaultMessage: 'Done',
});

export const EDIT_FIELD_ARIA_LABEL = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.editFieldAriaLabel', {
    defaultMessage: 'Edit {field}',
    values: { field },
  });

export const COMBINE_DESCRIPTIONS = i18n.translate('xpack.cases.mergeCases.combineDescriptions', {
  defaultMessage: 'Combine descriptions',
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

export const DESCRIPTION_TOO_LONG = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.descriptionTooLong', {
    defaultMessage:
      'Descriptions must be {max} characters or fewer. Edit the description to merge.',
    values: { max },
  });

export const ATTACHMENTS_SECTION = i18n.translate('xpack.cases.mergeCases.attachmentsSection', {
  defaultMessage: 'Attachments',
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

export const ALERTS_OVER_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.alertsOverLimit', {
    defaultMessage:
      'A case can have up to {max} alerts. Choose which ones to copy, or remove cases from this merge.',
    values: { max },
  });

export const OBSERVABLES_OVER_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.observablesOverLimit', {
    defaultMessage:
      'A case can have up to {max} observables. Choose which ones to copy, or remove cases from this merge.',
    values: { max },
  });

export const OTHER_OVER_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.otherOverLimit', {
    defaultMessage:
      'A case can have up to {max} of these attachments. Choose which ones to copy, or remove cases from this merge.',
    values: { max },
  });

export const LEFT_OUT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.leftOut', {
    defaultMessage: '{count} left out',
    values: { count },
  });

export const CHOOSE_ATTACHMENTS = i18n.translate(
  'xpack.cases.mergeCases.attachments.chooseAttachments',
  { defaultMessage: 'Choose attachments' }
);

export const CHOOSE_ATTACHMENTS_ARIA_LABEL = (kind: string) =>
  i18n.translate('xpack.cases.mergeCases.attachments.chooseAttachmentsAriaLabel', {
    defaultMessage: 'Choose which {kind} to copy',
    values: { kind },
  });

export const CHOOSE_ATTACHMENTS_TITLE = i18n.translate('xpack.cases.mergeCases.choices.title', {
  defaultMessage: 'Choose attachments to copy',
});

export const CHOOSE_ATTACHMENTS_DESCRIPTION = i18n.translate(
  'xpack.cases.mergeCases.choices.description',
  { defaultMessage: 'Attachments you leave out stay on their source cases.' }
);

export const CHOICES_SELECTED = (selected: number, total: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.selected', {
    defaultMessage: '{selected} of {total} selected',
    values: { selected, total },
  });

export const CHOICES_LEAVE_OUT_MORE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.leaveOutMore', {
    defaultMessage: 'Leave out {count} more to stay within the limit.',
    values: { count },
  });

export const CHOICES_WITHIN_LIMIT = i18n.translate('xpack.cases.mergeCases.choices.withinLimit', {
  defaultMessage: 'Within the limit.',
});

export const KEEP_NEWEST = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.keepNewest', {
    defaultMessage: 'Keep the newest {count}',
    values: { count },
  });

export const KEEP_NEWEST_HELP = i18n.translate('xpack.cases.mergeCases.choices.keepNewestHelp', {
  defaultMessage: 'Keeps the alerts most recently added to a case and leaves out the rest.',
});

export const CHOICES_LEFT_OUT_TOTAL = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.leftOutTotal', {
    defaultMessage: '{count} left out',
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

export const ATTACK_ALERTS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.choices.attackAlerts', {
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

export const APPLY = i18n.translate('xpack.cases.mergeCases.choices.apply', {
  defaultMessage: 'Apply',
});

export const NO_ATTACHMENTS = i18n.translate('xpack.cases.mergeCases.attachments.none', {
  defaultMessage: 'No attachments to copy.',
});

export const FILES_STAY = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.attachments.filesStay', {
    defaultMessage: '{count, plural, one {# file stays} other {# files stay}} on the source cases.',
    values: { count },
  });

export const COMMENTS_STAY = i18n.translate('xpack.cases.mergeCases.attachments.commentsStay', {
  defaultMessage: 'Comments stay on the source cases. The new case links to each one.',
});

export const COMMENTS_STAY_EXISTING_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.attachments.commentsStayExistingCase', {
    defaultMessage: 'Comments stay on the source cases. {caseRef} links to each one.',
    values: { caseRef },
  });

export const AFTER_MERGING_SECTION = i18n.translate('xpack.cases.mergeCases.afterMerging', {
  defaultMessage: 'After merging',
});

export const CLOSE_SOURCES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.closeSources', {
    defaultMessage: 'Close the {count, plural, one {source case} other {# source cases}}',
    values: { count },
  });

export const CLOSE_SOURCES_HELP = i18n.translate('xpack.cases.mergeCases.closeSourcesHelp', {
  defaultMessage:
    'They keep their comments, attachments, and history, and link to the new case. Their alerts keep their status.',
});

export const CLOSE_SOURCES_HELP_EXISTING_CASE = (caseRef: string, count: number) =>
  i18n.translate('xpack.cases.mergeCases.closeSourcesHelpExistingCase', {
    defaultMessage:
      '{count, plural, one {It keeps its comments, attachments, and history, and links to {caseRef}. Its alerts keep their status.} other {They keep their comments, attachments, and history, and link to {caseRef}. Their alerts keep their status.}}',
    values: { caseRef, count },
  });

export const NO_SOURCES_TO_CLOSE = i18n.translate('xpack.cases.mergeCases.noSourcesToClose', {
  defaultMessage:
    'The source cases are already closed. They keep their comments, attachments, and history, and link to the destination.',
});

export const ADD_NOTE = i18n.translate('xpack.cases.mergeCases.addNote', {
  defaultMessage: 'Add a note',
});

export const NOTE = i18n.translate('xpack.cases.mergeCases.note', {
  defaultMessage: 'Note',
});

export const NOTE_HELP_NEW_CASE = i18n.translate('xpack.cases.mergeCases.noteHelpNewCase', {
  defaultMessage: 'Added as a comment on the new case.',
});

export const NOTE_HELP_EXISTING_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.noteHelpExistingCase', {
    defaultMessage: 'Added as a comment on {caseRef}.',
    values: { caseRef },
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

export const SUMMARY_COPIES_NEW_CASE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.summary.copiesNewCase', {
    defaultMessage:
      '{count, plural, =0 {Nothing to copy into the new case.} one {Copies # attachment into the new case.} other {Copies # attachments into the new case.}}',
    values: { count },
  });

export const SUMMARY_COPIES_EXISTING_CASE = (count: number, caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.summary.copiesExistingCase', {
    defaultMessage:
      '{count, plural, =0 {Nothing to copy into {caseRef}.} one {Copies # attachment into {caseRef}.} other {Copies # attachments into {caseRef}.}}',
    values: { count, caseRef },
  });

export const SUMMARY_CLOSES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.summary.closes', {
    defaultMessage: 'Closes {count, plural, one {# case} other {# cases}}.',
    values: { count },
  });

export const BLOCKED_ADD_ANOTHER_CASE = i18n.translate(
  'xpack.cases.mergeCases.blocked.addAnotherCase',
  { defaultMessage: 'Add another case to merge' }
);

export const BLOCKED_ENTER_TITLE = i18n.translate('xpack.cases.mergeCases.blocked.enterTitle', {
  defaultMessage: 'Enter a title to merge',
});

export const BLOCKED_ENTER_DESCRIPTION = i18n.translate(
  'xpack.cases.mergeCases.blocked.enterDescription',
  { defaultMessage: 'Enter a description to merge' }
);

export const BLOCKED_SHORTEN_DESCRIPTION = i18n.translate(
  'xpack.cases.mergeCases.blocked.shortenDescription',
  { defaultMessage: 'Shorten the description to merge' }
);

export const BLOCKED_NO_DESTINATION = i18n.translate(
  'xpack.cases.mergeCases.blocked.noDestination',
  { defaultMessage: 'Add an open case to merge into' }
);

export const BLOCKED_RESOLVE_CONFLICTS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.resolveConflicts', {
    defaultMessage: 'Resolve {count, plural, one {# conflict} other {# conflicts}} to merge',
    values: { count },
  });

export const BLOCKED_FILL_IN_FIELD = (field: string) =>
  i18n.translate('xpack.cases.mergeCases.blocked.fillInField', {
    defaultMessage: 'Fill in {field} to merge',
    values: { field },
  });

export const BLOCKED_LEAVE_OUT_ALERTS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.leaveOutAlerts', {
    defaultMessage: 'Leave out {count, plural, one {# alert} other {# alerts}} to merge',
    values: { count },
  });

export const BLOCKED_LEAVE_OUT_OBSERVABLES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.leaveOutObservables', {
    defaultMessage: 'Leave out {count, plural, one {# observable} other {# observables}} to merge',
    values: { count },
  });

export const BLOCKED_LEAVE_OUT_OTHER = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.leaveOutOther', {
    defaultMessage: 'Leave out {count, plural, one {# attachment} other {# attachments}} to merge',
    values: { count },
  });

export const BLOCKED_TOO_MANY_ASSIGNEES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.tooManyAssignees', {
    defaultMessage: 'Remove {count, plural, one {# assignee} other {# assignees}} to merge',
    values: { count },
  });

export const BLOCKED_TOO_MANY_TAGS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.tooManyTags', {
    defaultMessage: 'Remove {count, plural, one {# tag} other {# tags}} to merge',
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
      "Every case was merged, but the activity entries or the note weren't all added. Check the activity of {caseRef}.",
    values: { caseRef },
  });

export const FAILURE_TOAST_TITLE = i18n.translate('xpack.cases.mergeCases.failureToastTitle', {
  defaultMessage: "We couldn't merge these cases",
});

export const FAILURE_TOAST_BODY = i18n.translate('xpack.cases.mergeCases.failureToastBody', {
  defaultMessage:
    'No cases were changed. Try again. If this keeps happening, contact your administrator.',
});

export const MERGED_INTO = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.mergedInto', {
    defaultMessage: 'Merged into {caseRef}',
    values: { caseRef },
  });

export const MERGED = i18n.translate('xpack.cases.mergeCases.merged', {
  defaultMessage: 'Merged',
});

export const MERGE_WITH_OTHER_CASES = i18n.translate('xpack.cases.mergeCases.mergeWithOtherCases', {
  defaultMessage: 'Merge with other cases',
});

export const ADD_CASES = i18n.translate('xpack.cases.mergeCases.addCases', {
  defaultMessage: 'Add cases',
});

export const ADD_CASES_PLACEHOLDER = i18n.translate('xpack.cases.mergeCases.addCasesPlaceholder', {
  defaultMessage: 'Search by title or #number',
});

export const ADD_CASES_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.mergeCases.addCasesLimit', {
    defaultMessage: 'You can merge up to {max} cases at once.',
    values: { max },
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
