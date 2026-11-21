/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'xpack.cases.investigations.modals';

/* Shared */
export const CANCEL = i18n.translate(`${PREFIX}.cancel`, { defaultMessage: 'Cancel' });
export const CLOSE_BUTTON = i18n.translate(`${PREFIX}.closeButton`, { defaultMessage: 'Close' });
export const OPTIONAL = i18n.translate(`${PREFIX}.optional`, { defaultMessage: 'Optional' });

/* Determination */
export const DETERMINATION_TITLE = i18n.translate(`${PREFIX}.determinationTitle`, {
  defaultMessage: 'Set your determination',
});
export const DETERMINATION_EDIT_TITLE = i18n.translate(`${PREFIX}.determinationEditTitle`, {
  defaultMessage: 'Edit your determination',
});
export const DETERMINATION_INTRO = i18n.translate(`${PREFIX}.determinationIntro`, {
  defaultMessage:
    'Your determination becomes the final verdict. The agent verdict stays on record as superseded.',
});
export const DETERMINATION_OPTIONS_LABEL = i18n.translate(`${PREFIX}.determinationOptionsLabel`, {
  defaultMessage: 'Determination',
});
export const DETERMINATION_TRUE_POSITIVE_HELP = i18n.translate(
  `${PREFIX}.determinationTruePositiveHelp`,
  { defaultMessage: 'Confirmed malicious activity.' }
);
export const DETERMINATION_FALSE_POSITIVE_HELP = i18n.translate(
  `${PREFIX}.determinationFalsePositiveHelp`,
  { defaultMessage: 'The alert fired, but nothing harmful happened.' }
);
export const DETERMINATION_BENIGN_POSITIVE_HELP = i18n.translate(
  `${PREFIX}.determinationBenignPositiveHelp`,
  { defaultMessage: 'Real activity that was expected or authorized.' }
);
export const DETERMINATION_SUSPICIOUS_HELP = i18n.translate(
  `${PREFIX}.determinationSuspiciousHelp`,
  { defaultMessage: 'Looks wrong, but it is not confirmed.' }
);
export const DETERMINATION_UNDETERMINED_HELP = i18n.translate(
  `${PREFIX}.determinationUndeterminedHelp`,
  { defaultMessage: 'Not enough evidence to decide.' }
);
export const DETERMINATION_REASON_LABEL = i18n.translate(`${PREFIX}.determinationReasonLabel`, {
  defaultMessage: 'Reason',
});
export const DETERMINATION_REASON_PLACEHOLDER = i18n.translate(
  `${PREFIX}.determinationReasonPlaceholder`,
  { defaultMessage: 'What decided it for you?' }
);
export const DETERMINATION_SAVE = i18n.translate(`${PREFIX}.determinationSave`, {
  defaultMessage: 'Save determination',
});
export const DETERMINATION_SAVED = i18n.translate(`${PREFIX}.determinationSaved`, {
  defaultMessage: 'Determination saved. It is now the final verdict.',
});
export const DETERMINATION_REVERT = i18n.translate(`${PREFIX}.determinationRevert`, {
  defaultMessage: 'Revert to agent verdict',
});
export const DETERMINATION_REVERTED = i18n.translate(`${PREFIX}.determinationReverted`, {
  defaultMessage: 'Reverted. The agent verdict is current again.',
});

/* Close */
export const CLOSE_TITLE = i18n.translate(`${PREFIX}.closeTitle`, {
  defaultMessage: 'Close this investigation',
});
export const CLOSE_CONFIRM = i18n.translate(`${PREFIX}.closeConfirm`, {
  defaultMessage: 'Close investigation',
});
export const CLOSE_STATUS_AFTER = (status: string) =>
  i18n.translate(`${PREFIX}.closeStatusAfter`, {
    defaultMessage: 'The investigation moves to {status}.',
    values: { status },
  });
export const CLOSE_TASKS_LOADING = i18n.translate(`${PREFIX}.closeTasksLoading`, {
  defaultMessage: 'Checking required tasks',
});
export const CLOSE_TASKS_ERROR = i18n.translate(`${PREFIX}.closeTasksError`, {
  defaultMessage: 'Could not check the required tasks',
});
export const CLOSE_TASKS_BLOCKED = (count: number) =>
  i18n.translate(`${PREFIX}.closeTasksBlocked`, {
    defaultMessage: '{count, plural, one {# required task is} other {# required tasks are}} open',
    values: { count },
  });
export const CLOSE_TASKS_BLOCKED_BODY = i18n.translate(`${PREFIX}.closeTasksBlockedBody`, {
  defaultMessage: 'These must be done before the investigation closes.',
});
export const CLOSE_TASKS_MORE = (count: number) =>
  i18n.translate(`${PREFIX}.closeTasksMore`, {
    defaultMessage: '{count, plural, one {# more required task} other {# more required tasks}}',
    values: { count },
  });
export const CLOSE_CLAIMS_UNREVIEWED = (count: number) =>
  i18n.translate(`${PREFIX}.closeClaimsUnreviewed`, {
    defaultMessage:
      '{count, plural, one {# agent conclusion is} other {# agent conclusions are}} not reviewed yet.',
    values: { count },
  });
export const CLOSE_PROPOSALS_PENDING = (count: number) =>
  i18n.translate(`${PREFIX}.closeProposalsPending`, {
    defaultMessage:
      '{count, plural, one {# pending proposal} other {# pending proposals}} will be withdrawn when you close.',
    values: { count },
  });
export const CLOSE_ALERTS_NOTE = (count: number) =>
  i18n.translate(`${PREFIX}.closeAlertsNote`, {
    defaultMessage:
      'The {count, plural, one {# alert} other {# alerts}} in this investigation close when you close it.',
    values: { count },
  });
export const CLOSE_REASON_LABEL = i18n.translate(`${PREFIX}.closeReasonLabel`, {
  defaultMessage: 'Reason for closing',
});
export const CLOSE_REASON_SEARCH_PLACEHOLDER = i18n.translate(
  `${PREFIX}.closeReasonSearchPlaceholder`,
  { defaultMessage: 'Select a close reason' }
);
export const CLOSE_VERDICT_LINE_NONE = i18n.translate(`${PREFIX}.closeVerdictLineNone`, {
  defaultMessage: 'No human verdict is set for this reason. You can set one on the investigation.',
});
export const CLOSE_VERDICT_LINE_SETS = (verdict: string) =>
  i18n.translate(`${PREFIX}.closeVerdictLineSets`, {
    defaultMessage: 'Sets the human verdict to {verdict}.',
    values: { verdict },
  });
export const CLOSE_VERDICT_LINE_AGREES = (verdict: string) =>
  i18n.translate(`${PREFIX}.closeVerdictLineAgrees`, {
    defaultMessage: 'Sets the human verdict to {verdict}. That agrees with the AI verdict.',
    values: { verdict },
  });
export const CLOSE_VERDICT_LINE_DIFFERS = (verdict: string, aiVerdict: string) =>
  i18n.translate(`${PREFIX}.closeVerdictLineDiffers`, {
    defaultMessage:
      'Sets the human verdict to {verdict}. That differs from the AI verdict ({aiVerdict}).',
    values: { verdict, aiVerdict },
  });
export const CLOSE_NOTES_LABEL = i18n.translate(`${PREFIX}.closeNotesLabel`, {
  defaultMessage: 'Closing notes',
});
export const CLOSE_NOTES_HELP = i18n.translate(`${PREFIX}.closeNotesHelp`, {
  defaultMessage: 'Added to the investigation as a comment.',
});
export const CLOSE_NOTES_PLACEHOLDER = i18n.translate(`${PREFIX}.closeNotesPlaceholder`, {
  defaultMessage: 'What happened and what you did',
});
export const CLOSE_MISSING_TITLE = i18n.translate(`${PREFIX}.closeMissingTitle`, {
  defaultMessage: 'To close the investigation:',
});
export const CLOSE_MISSING_REASON = i18n.translate(`${PREFIX}.closeMissingReason`, {
  defaultMessage: 'Choose a reason for closing',
});
export const CLOSE_MISSING_TASKS = (count: number) =>
  i18n.translate(`${PREFIX}.closeMissingTasks`, {
    defaultMessage: 'Finish {count, plural, one {# required task} other {# required tasks}}',
    values: { count },
  });
export const CLOSE_MISSING_FIELD = (label: string) =>
  i18n.translate(`${PREFIX}.closeMissingField`, {
    defaultMessage: 'Fill in {label}',
    values: { label },
  });
export const CLOSE_MISSING_CHECKING = i18n.translate(`${PREFIX}.closeMissingChecking`, {
  defaultMessage: 'Wait while the required tasks and fields are checked',
});
export const CLOSE_SERVER_ERROR_TITLE = i18n.translate(`${PREFIX}.closeServerErrorTitle`, {
  defaultMessage: 'The investigation could not be closed',
});

/* Reopen */
export const REOPEN_TITLE = i18n.translate(`${PREFIX}.reopenTitle`, {
  defaultMessage: 'Reopen investigation?',
});
export const REOPEN_BODY = i18n.translate(`${PREFIX}.reopenBody`, {
  defaultMessage:
    'The investigation moves back to in progress. Agents and people can add to it again.',
});
export const REOPEN_CONFIRM = i18n.translate(`${PREFIX}.reopenConfirm`, {
  defaultMessage: 'Reopen investigation',
});

/* Report */
export const REPORT_TITLE = i18n.translate(`${PREFIX}.reportTitle`, {
  defaultMessage: 'Investigation report',
});
export const REPORT_INTRO = i18n.translate(`${PREFIX}.reportIntro`, {
  defaultMessage:
    'Built from the record: summary, verdict, timeline, claims with evidence, actions with who approved them, the procedure, and the evidence inventory.',
});
export const REPORT_LOADING = i18n.translate(`${PREFIX}.reportLoading`, {
  defaultMessage: 'Building the report',
});
export const REPORT_ERROR = i18n.translate(`${PREFIX}.reportError`, {
  defaultMessage: 'Could not build the report',
});
export const REPORT_VIEW_LEGEND = i18n.translate(`${PREFIX}.reportViewLegend`, {
  defaultMessage: 'Report view',
});
export const REPORT_VIEW_PREVIEW = i18n.translate(`${PREFIX}.reportViewPreview`, {
  defaultMessage: 'Preview',
});
export const REPORT_VIEW_RAW = i18n.translate(`${PREFIX}.reportViewRaw`, {
  defaultMessage: 'Markdown',
});
export const REPORT_DOWNLOAD = i18n.translate(`${PREFIX}.reportDownload`, {
  defaultMessage: 'Download as file',
});
export const REPORT_COPY = i18n.translate(`${PREFIX}.reportCopy`, {
  defaultMessage: 'Copy as Markdown',
});
export const REPORT_COPIED = i18n.translate(`${PREFIX}.reportCopied`, {
  defaultMessage: 'Copied the report as Markdown.',
});
export const REPORT_COPY_ERROR = i18n.translate(`${PREFIX}.reportCopyError`, {
  defaultMessage: 'Could not copy the report',
});
export const REPORT_DOWNLOADED = (filename: string) =>
  i18n.translate(`${PREFIX}.reportDownloaded`, {
    defaultMessage: 'Downloaded {filename}.',
    values: { filename },
  });

/* Change history */
export const HISTORY_TITLE = i18n.translate(`${PREFIX}.historyTitle`, {
  defaultMessage: 'Change history',
});
export const HISTORY_INTRO = i18n.translate(`${PREFIX}.historyIntro`, {
  defaultMessage:
    'Every version of the description, conclusions and closing summary, with who or what changed it.',
});
export const HISTORY_LOADING = i18n.translate(`${PREFIX}.historyLoading`, {
  defaultMessage: 'Loading the change history',
});
export const HISTORY_ERROR = i18n.translate(`${PREFIX}.historyError`, {
  defaultMessage: 'Could not load the change history',
});
export const HISTORY_EMPTY_TITLE = i18n.translate(`${PREFIX}.historyEmptyTitle`, {
  defaultMessage: 'No changes recorded yet',
});
export const HISTORY_EMPTY_BODY = i18n.translate(`${PREFIX}.historyEmptyBody`, {
  defaultMessage:
    'When the description, a conclusion or the closing summary changes, each version shows up here.',
});
export const HISTORY_CURRENT = i18n.translate(`${PREFIX}.historyCurrent`, {
  defaultMessage: 'Current',
});

/* Merge */
export const MERGE_TITLE = i18n.translate(`${PREFIX}.mergeTitle`, {
  defaultMessage: 'Merge with another investigation',
});
export const MERGE_INTRO = i18n.translate(`${PREFIX}.mergeIntro`, {
  defaultMessage:
    'Merge investigations that cover the same activity. An agent can propose a merge, and a person approves it.',
});
export const MERGE_ALREADY_MERGED = i18n.translate(`${PREFIX}.mergeAlreadyMerged`, {
  defaultMessage:
    'This investigation was already merged into another one. It cannot be merged again.',
});
export const MERGE_RELATED_HEADING = i18n.translate(`${PREFIX}.mergeRelatedHeading`, {
  defaultMessage: 'Related investigations',
});
export const MERGE_RELATED_EMPTY = i18n.translate(`${PREFIX}.mergeRelatedEmpty`, {
  defaultMessage: 'No related investigations to merge with. Search for another one instead.',
});
export const MERGE_RELATED_ERROR = i18n.translate(`${PREFIX}.mergeRelatedError`, {
  defaultMessage: 'Could not load related investigations',
});
export const MERGE_SEARCH_LABEL = i18n.translate(`${PREFIX}.mergeSearchLabel`, {
  defaultMessage: 'Find another investigation',
});
export const MERGE_SEARCH_PLACEHOLDER = i18n.translate(`${PREFIX}.mergeSearchPlaceholder`, {
  defaultMessage: 'Search by id or title, for example INV-240',
});
export const MERGE_SEARCH_HELP = i18n.translate(`${PREFIX}.mergeSearchHelp`, {
  defaultMessage: 'Finds any other open investigation, even one with nothing in common.',
});
export const MERGE_SEARCH_RESULTS = i18n.translate(`${PREFIX}.mergeSearchResults`, {
  defaultMessage: 'Search results',
});
export const MERGE_SEARCH_EMPTY = i18n.translate(`${PREFIX}.mergeSearchEmpty`, {
  defaultMessage: 'No other open investigation matches that search.',
});
export const MERGE_SEARCH_ERROR = i18n.translate(`${PREFIX}.mergeSearchError`, {
  defaultMessage: 'Could not search investigations',
});
export const MERGE_ALERTS = (count: number) =>
  i18n.translate(`${PREFIX}.mergeAlerts`, {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });
export const MERGE_PRIMARY_HEADING = i18n.translate(`${PREFIX}.mergePrimaryHeading`, {
  defaultMessage: 'Which one stays as the primary?',
});
export const MERGE_PRIMARY_LEGEND = i18n.translate(`${PREFIX}.mergePrimaryLegend`, {
  defaultMessage: 'Primary investigation',
});
export const MERGE_THIS_ONE = (displayId: string) =>
  i18n.translate(`${PREFIX}.mergeThisOne`, {
    defaultMessage: '{displayId} (this one)',
    values: { displayId },
  });
export const MERGE_KEEPS_HEADING = i18n.translate(`${PREFIX}.mergeKeepsHeading`, {
  defaultMessage: 'What the merge keeps',
});
export const MERGE_KEEPS_COLUMN_WHAT = i18n.translate(`${PREFIX}.mergeKeepsColumnWhat`, {
  defaultMessage: 'What',
});
export const MERGE_KEEPS_COLUMN_RESULT = i18n.translate(`${PREFIX}.mergeKeepsColumnResult`, {
  defaultMessage: 'What happens',
});
export const MERGE_KEEPS_EVIDENCE = i18n.translate(`${PREFIX}.mergeKeepsEvidence`, {
  defaultMessage: 'Evidence',
});
export const MERGE_KEEPS_EVIDENCE_VALUE = (total: number, here: number, there: number) =>
  i18n.translate(`${PREFIX}.mergeKeepsEvidenceValue`, {
    defaultMessage:
      'All evidence from both, nothing deleted ({total} in total: {here} here, {there} there)',
    values: { total, here, there },
  });
export const MERGE_KEEPS_CLAIMS = i18n.translate(`${PREFIX}.mergeKeepsClaims`, {
  defaultMessage: 'Claims',
});
export const MERGE_KEEPS_CLAIMS_VALUE = (total: number, here: number, there: number) =>
  i18n.translate(`${PREFIX}.mergeKeepsClaimsValue`, {
    defaultMessage: 'Both sets of claims ({total} in total: {here} here, {there} there)',
    values: { total, here, there },
  });
export const MERGE_KEEPS_ALERTS = i18n.translate(`${PREFIX}.mergeKeepsAlerts`, {
  defaultMessage: 'Alerts',
});
export const MERGE_KEEPS_ALERTS_VALUE = (total: number, here: number, there: number) =>
  i18n.translate(`${PREFIX}.mergeKeepsAlertsValue`, {
    defaultMessage: '{total} in total ({here} here, {there} there)',
    values: { total, here, there },
  });
export const MERGE_KEEPS_HISTORY = i18n.translate(`${PREFIX}.mergeKeepsHistory`, {
  defaultMessage: 'History',
});
export const MERGE_KEEPS_HISTORY_VALUE = i18n.translate(`${PREFIX}.mergeKeepsHistoryValue`, {
  defaultMessage: 'Both timelines, ordered by time. Every entry keeps its author.',
});
export const MERGE_KEEPS_OTHER = i18n.translate(`${PREFIX}.mergeKeepsOther`, {
  defaultMessage: 'The other investigation',
});
export const MERGE_KEEPS_OTHER_VALUE = i18n.translate(`${PREFIX}.mergeKeepsOtherValue`, {
  defaultMessage: 'Closes as merged and links to the primary',
});
export const MERGE_CONFIRM_BUTTON = i18n.translate(`${PREFIX}.mergeConfirmButton`, {
  defaultMessage: 'Merge investigations',
});
export const MERGE_CONFIRM_TITLE = i18n.translate(`${PREFIX}.mergeConfirmTitle`, {
  defaultMessage: 'Merge these investigations?',
});
export const MERGE_CONFIRM_BODY = (primary: string, merged: string) =>
  i18n.translate(`${PREFIX}.mergeConfirmBody`, {
    defaultMessage:
      'Everything in {merged} moves into {primary}, and {merged} closes as merged. This cannot be undone.',
    values: { primary, merged },
  });
export const MERGE_SERVER_ERROR_TITLE = i18n.translate(`${PREFIX}.mergeServerErrorTitle`, {
  defaultMessage: 'The investigations could not be merged',
});
export const MERGE_SUCCESS = (merged: string, primary: string, moved: number) =>
  i18n.translate(`${PREFIX}.mergeSuccess`, {
    defaultMessage:
      'Merged {merged} into {primary}. {moved, plural, one {# item} other {# items}} moved.',
    values: { merged, primary, moved },
  });

/* Restrict access */
export const RESTRICT_TITLE = i18n.translate(`${PREFIX}.restrictTitle`, {
  defaultMessage: 'Restrict access',
});
export const RESTRICT_INTRO = i18n.translate(`${PREFIX}.restrictIntro`, {
  defaultMessage:
    'Limit this investigation to named people. Investigation pages, the queue, search and agents honour it.',
});
export const RESTRICT_CASES_WARNING = i18n.translate(`${PREFIX}.restrictCasesWarning`, {
  defaultMessage: 'The classic Cases pages do not.',
});
export const RESTRICT_PEOPLE_LABEL = i18n.translate(`${PREFIX}.restrictPeopleLabel`, {
  defaultMessage: 'People who can open this investigation',
});
export const RESTRICT_PEOPLE_PLACEHOLDER = i18n.translate(`${PREFIX}.restrictPeoplePlaceholder`, {
  defaultMessage: 'Choose people or type a username and press Enter',
});
export const RESTRICT_PEOPLE_HELP = i18n.translate(`${PREFIX}.restrictPeopleHelp`, {
  defaultMessage: 'Use usernames. Suggestions come from the people on this investigation.',
});
export const RESTRICT_EFFECT = i18n.translate(`${PREFIX}.restrictEffect`, {
  defaultMessage:
    'Everyone else sees "Investigation not found" when they open it, and it disappears from the queue and search.',
});
export const RESTRICT_STAY_ON_LIST = i18n.translate(`${PREFIX}.restrictStayOnList`, {
  defaultMessage: 'You have to stay on the list. Without you the investigation would lock you out.',
});
export const RESTRICT_USERNAME_TOO_LONG = i18n.translate(`${PREFIX}.restrictUsernameTooLong`, {
  defaultMessage: 'A username can have at most 512 characters.',
});
export const RESTRICT_SAVE = i18n.translate(`${PREFIX}.restrictSave`, {
  defaultMessage: 'Save restriction',
});
export const RESTRICT_REMOVE = i18n.translate(`${PREFIX}.restrictRemove`, {
  defaultMessage: 'Remove restriction',
});
export const RESTRICT_SAVED = (count: number) =>
  i18n.translate(`${PREFIX}.restrictSaved`, {
    defaultMessage: 'Access restricted to {count, plural, one {# person} other {# people}}.',
    values: { count },
  });
export const RESTRICT_REMOVED = i18n.translate(`${PREFIX}.restrictRemoved`, {
  defaultMessage: 'Restriction removed. Everyone with access to Investigations can open it.',
});

/* Header additions */
export const HEADER_RESTRICT_ACCESS = i18n.translate(`${PREFIX}.headerRestrictAccess`, {
  defaultMessage: 'Restrict access',
});
export const HEADER_RESTRICTED_BADGE = i18n.translate(`${PREFIX}.headerRestrictedBadge`, {
  defaultMessage: 'Restricted',
});
export const HEADER_RESTRICTED_TOOLTIP_TITLE = i18n.translate(
  `${PREFIX}.headerRestrictedTooltipTitle`,
  { defaultMessage: 'Only these people can open this investigation' }
);
export const HEADER_RESTRICTED_BADGE_ARIA = (people: string) =>
  i18n.translate(`${PREFIX}.headerRestrictedBadgeAria`, {
    defaultMessage: 'Restricted to {people}. Change access restriction.',
    values: { people },
  });
export const HEADER_MERGED_INTO = (displayId: string) =>
  i18n.translate(`${PREFIX}.headerMergedInto`, {
    defaultMessage: 'Merged into {displayId}',
    values: { displayId },
  });
export const HEADER_MERGED_INTO_UNKNOWN = i18n.translate(`${PREFIX}.headerMergedIntoUnknown`, {
  defaultMessage: 'Merged into another investigation',
});
export const HEADER_MERGED_BODY = i18n.translate(`${PREFIX}.headerMergedBody`, {
  defaultMessage:
    'This investigation is closed and its items moved to the primary investigation. Open the primary to keep working.',
});

/* Change type */
export const CHANGE_TYPE_TITLE = i18n.translate(`${PREFIX}.changeTypeTitle`, {
  defaultMessage: 'Change type',
});
export const APPLY_TYPE_TITLE = i18n.translate(`${PREFIX}.applyTypeTitle`, {
  defaultMessage: 'Apply a type',
});
export const CHANGE_TYPE_LABEL = i18n.translate(`${PREFIX}.changeTypeLabel`, {
  defaultMessage: 'Type',
});
export const CHANGE_TYPE_PLACEHOLDER = i18n.translate(`${PREFIX}.changeTypePlaceholder`, {
  defaultMessage: 'Select a type',
});
export const CHANGE_TYPE_HINT = i18n.translate(`${PREFIX}.changeTypeHint`, {
  defaultMessage:
    "The current type's fields will be hidden, but their saved values stay on the investigation. Values with the same field name and kind are kept in the new type.",
});
export const CHANGE_TYPE_NO_TYPES = i18n.translate(`${PREFIX}.changeTypeNoTypes`, {
  defaultMessage: 'There are no investigation types to choose from.',
});
export const CHANGE_TYPE_TYPES_ERROR = i18n.translate(`${PREFIX}.changeTypeTypesError`, {
  defaultMessage: 'Could not load the investigation types.',
});
export const CHANGE_TYPE_SERVER_ERROR_TITLE = i18n.translate(
  `${PREFIX}.changeTypeServerErrorTitle`,
  {
    defaultMessage: 'The type could not be changed',
  }
);

/* Required on close */
export const CLOSE_FIELDS_TITLE = i18n.translate(`${PREFIX}.closeFieldsTitle`, {
  defaultMessage: 'Required before closing',
});
export const CLOSE_FIELDS_HELP = i18n.translate(`${PREFIX}.closeFieldsHelp`, {
  defaultMessage: 'The type of this investigation needs these fields filled in to close it.',
});

/* Pause time tracking */
export const PAUSE_TITLE = i18n.translate(`${PREFIX}.pauseTitle`, {
  defaultMessage: 'Pause time tracking',
});
export const PAUSE_BODY = (status: string) =>
  i18n.translate(`${PREFIX}.pauseBody`, {
    defaultMessage:
      'Pick why this investigation is waiting. Time in {status} is left out of its age and timings.',
    values: { status },
  });
export const PAUSE_REASON_LABEL = i18n.translate(`${PREFIX}.pauseReasonLabel`, {
  defaultMessage: 'Pause reason',
});
export const PAUSE_CONFIRM = (status: string) =>
  i18n.translate(`${PREFIX}.pauseConfirm`, {
    defaultMessage: 'Move to {status}',
    values: { status },
  });
export const PAUSE_REASON_REQUIRED = i18n.translate(`${PREFIX}.pauseReasonRequired`, {
  defaultMessage: 'Pick a reason to continue.',
});
export const PAUSE_NO_REASONS = i18n.translate(`${PREFIX}.pauseNoReasons`, {
  defaultMessage: 'No pause reasons are configured. Add one in the Cases settings.',
});
export const PAUSE_LOADING = i18n.translate(`${PREFIX}.pauseLoading`, {
  defaultMessage: 'Loading the pause reasons',
});
export const PAUSE_ERROR = i18n.translate(`${PREFIX}.pauseError`, {
  defaultMessage: 'Could not load the pause reasons',
});
export const PAUSE_UNKNOWN_STATUS = i18n.translate(`${PREFIX}.pauseUnknownStatus`, {
  defaultMessage: 'This status is no longer configured.',
});
export const PAUSE_SERVER_ERROR_TITLE = i18n.translate(`${PREFIX}.pauseServerErrorTitle`, {
  defaultMessage: 'The status could not be changed',
});
