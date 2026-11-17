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
    'Alerts, events, and observables are copied into one case. Files, comments, and history stay on the original cases.',
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

export const TO_REVIEW = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.toReview', {
    defaultMessage: '{count} to review',
    values: { count },
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

export const EMPTY_VALUE = i18n.translate('xpack.cases.mergeCases.emptyValue', {
  defaultMessage: 'None',
});

export const CONFLICT_TRIGGER = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.conflictTrigger', {
    defaultMessage: '{count} values',
    values: { count },
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

export const CHOOSE_ATTACHMENTS_TITLE = i18n.translate('xpack.cases.mergeCases.choices.title', {
  defaultMessage: 'Choose attachments to copy',
});

export const CHOOSE_ATTACHMENTS_DESCRIPTION = i18n.translate(
  'xpack.cases.mergeCases.choices.description',
  { defaultMessage: 'Attachments you leave out stay on their original cases.' }
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
    defaultMessage:
      '{count, plural, one {# file stays} other {# files stay}} on the original cases.',
    values: { count },
  });

export const COMMENTS_STAY = i18n.translate('xpack.cases.mergeCases.attachments.commentsStay', {
  defaultMessage: 'Comments stay on the original cases. The new case links to each one.',
});

export const COMMENTS_STAY_EXISTING_CASE = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.attachments.commentsStayExistingCase', {
    defaultMessage: 'Comments stay on the original cases. {caseRef} links to each one.',
    values: { caseRef },
  });

export const AFTER_MERGING_SECTION = i18n.translate('xpack.cases.mergeCases.afterMerging', {
  defaultMessage: 'After merging',
});

export const CLOSE_ORIGINALS = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.closeOriginals', {
    defaultMessage: 'Close the {count, plural, one {original case} other {# original cases}}',
    values: { count },
  });

export const CLOSE_ORIGINALS_HELP_SYNC = i18n.translate(
  'xpack.cases.mergeCases.closeOriginalsHelpSync',
  {
    defaultMessage:
      'They keep their comments, attachments, and history, and link to the new case. Their alerts stay open.',
  }
);

export const CLOSE_ORIGINALS_HELP = i18n.translate('xpack.cases.mergeCases.closeOriginalsHelp', {
  defaultMessage: 'They keep their comments, attachments, and history, and link to the new case.',
});

export const CLOSE_ORIGINALS_HELP_SYNC_EXISTING_CASE = (caseRef: string, count: number) =>
  i18n.translate('xpack.cases.mergeCases.closeOriginalsHelpSyncExistingCase', {
    defaultMessage:
      '{count, plural, one {It keeps its comments, attachments, and history, and links to {caseRef}. Its alerts stay open.} other {They keep their comments, attachments, and history, and link to {caseRef}. Their alerts stay open.}}',
    values: { caseRef, count },
  });

export const CLOSE_ORIGINALS_HELP_EXISTING_CASE = (caseRef: string, count: number) =>
  i18n.translate('xpack.cases.mergeCases.closeOriginalsHelpExistingCase', {
    defaultMessage:
      '{count, plural, one {It keeps its comments, attachments, and history, and links to {caseRef}.} other {They keep their comments, attachments, and history, and link to {caseRef}.}}',
    values: { caseRef, count },
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

export const BLOCKED_ALERTS_OVER_LIMIT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.alertsOverLimit', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}} over the limit',
    values: { count },
  });

export const BLOCKED_OBSERVABLES_OVER_LIMIT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.observablesOverLimit', {
    defaultMessage: '{count, plural, one {# observable} other {# observables}} over the limit',
    values: { count },
  });

export const BLOCKED_OTHER_OVER_LIMIT = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.blocked.otherOverLimit', {
    defaultMessage: '{count, plural, one {# attachment} other {# attachments}} over the limit',
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

export const PARTIAL_TOAST_BODY = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.partialToastBody', {
    defaultMessage:
      "Anything that wasn't copied is still on its original case. Check the activity of {caseRef} to see what was copied.",
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

export const MERGED_INTO_CASES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.mergedIntoCases', {
    defaultMessage: 'Merged into {count, plural, one {# case} other {# cases}}',
    values: { count },
  });

export const MERGED = i18n.translate('xpack.cases.mergeCases.merged', {
  defaultMessage: 'Merged',
});

export const MERGED_INTO_DESTINATIONS = i18n.translate(
  'xpack.cases.mergeCases.mergedIntoDestinations',
  { defaultMessage: 'Cases this case was merged into' }
);

export const MERGED_INTO_CALLOUT_TITLE = (caseRef: string, title: string) =>
  i18n.translate('xpack.cases.mergeCases.mergedIntoCalloutTitle', {
    defaultMessage: 'Merged into {caseRef}: {title}',
    values: { caseRef, title },
  });

export const MERGED_INTO_CALLOUT_BODY = (caseRef: string) =>
  i18n.translate('xpack.cases.mergeCases.mergedIntoCalloutBody', {
    defaultMessage:
      'Continue the investigation in {caseRef}. This case keeps its comments, attachments, and history.',
    values: { caseRef },
  });

export const MERGED_INTO_CASES_CALLOUT_BODY = i18n.translate(
  'xpack.cases.mergeCases.mergedIntoCasesCalloutBody',
  {
    defaultMessage:
      'Continue the investigation in one of them. This case keeps its comments, attachments, and history.',
  }
);

export const MERGED_INTO_UNAVAILABLE_CASES = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.mergedIntoUnavailableCases', {
    defaultMessage: "You don't have access to {count} of them.",
    values: { count },
  });

export const MERGED_INTO_ANOTHER_CASE = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.mergedIntoAnotherCase', {
    defaultMessage:
      '{count, plural, one {Merged into another case} other {Merged into # other cases}}',
    values: { count },
  });

export const MERGED_INTO_ANOTHER_CASE_BODY = (count: number) =>
  i18n.translate('xpack.cases.mergeCases.mergedIntoAnotherCaseBody', {
    defaultMessage:
      "{count, plural, one {This case keeps its comments, attachments, and history. You don't have access to the case it was merged into.} other {This case keeps its comments, attachments, and history. You don't have access to the cases it was merged into.}}",
    values: { count },
  });
