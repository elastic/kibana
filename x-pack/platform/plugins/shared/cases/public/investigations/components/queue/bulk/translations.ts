/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'xpack.cases.investigations.queue.bulk';

/* Bar */
export const BAR_LABEL = i18n.translate(`${PREFIX}.barLabel`, {
  defaultMessage: 'Actions for the selected investigations',
});
export const SELECTED = (count: number) =>
  i18n.translate(`${PREFIX}.selected`, {
    defaultMessage: '{count, plural, one {# investigation} other {# investigations}} selected',
    values: { count },
  });
export const CLEAR_SELECTION = i18n.translate(`${PREFIX}.clearSelection`, {
  defaultMessage: 'Clear selection',
});
export const ASSIGN = i18n.translate(`${PREFIX}.assign`, { defaultMessage: 'Assign' });
export const CHANGE_STATUS = i18n.translate(`${PREFIX}.changeStatus`, {
  defaultMessage: 'Change status',
});
export const CHANGE_PRIORITY = i18n.translate(`${PREFIX}.changePriority`, {
  defaultMessage: 'Change priority',
});
export const ADD_TAGS = i18n.translate(`${PREFIX}.addTags`, { defaultMessage: 'Add tags' });
export const CLOSE = i18n.translate(`${PREFIX}.close`, { defaultMessage: 'Close' });
export const STATUS_LIST_LABEL = i18n.translate(`${PREFIX}.statusListLabel`, {
  defaultMessage: 'Status for the selected investigations',
});

/* Shared dialog wording */
export const CANCEL = i18n.translate(`${PREFIX}.cancel`, { defaultMessage: 'Cancel' });
export const OPTIONAL = i18n.translate(`${PREFIX}.optional`, { defaultMessage: 'Optional' });

/* Assign */
export const ASSIGN_TITLE = i18n.translate(`${PREFIX}.assignTitle`, {
  defaultMessage: 'Assign people',
});
export const ASSIGN_BODY = (count: number) =>
  i18n.translate(`${PREFIX}.assignBody`, {
    defaultMessage:
      'Add these people as assignees of {count, plural, one {# investigation} other {# investigations}}. Existing assignees stay assigned.',
    values: { count },
  });
export const ASSIGN_CHOOSE = i18n.translate(`${PREFIX}.assignChoose`, {
  defaultMessage: 'Choose people',
});
export const ASSIGN_CHOSEN_LABEL = i18n.translate(`${PREFIX}.assignChosenLabel`, {
  defaultMessage: 'Assignees to add',
});
export const ASSIGN_NONE_CHOSEN = i18n.translate(`${PREFIX}.assignNoneChosen`, {
  defaultMessage: 'Nobody chosen yet.',
});
export const ASSIGN_CONFIRM = i18n.translate(`${PREFIX}.assignConfirm`, {
  defaultMessage: 'Assign',
});
export const ASSIGN_RUNNING = i18n.translate(`${PREFIX}.assignRunning`, {
  defaultMessage: 'Assigning people',
});

/* Status */
export const STATUS_RUNNING = (status: string) =>
  i18n.translate(`${PREFIX}.statusRunning`, {
    defaultMessage: 'Moving to {status}',
    values: { status },
  });
export const PAUSE_BULK_BODY = (status: string) =>
  i18n.translate(`${PREFIX}.pauseBulkBody`, {
    defaultMessage:
      'Pick why these investigations are waiting. Time in {status} is left out of their age and timings.',
    values: { status },
  });

/* Priority */
export const PRIORITY_TITLE = i18n.translate(`${PREFIX}.priorityTitle`, {
  defaultMessage: 'Change priority',
});
export const PRIORITY_BODY = (count: number) =>
  i18n.translate(`${PREFIX}.priorityBody`, {
    defaultMessage:
      'Set the priority of {count, plural, one {# investigation} other {# investigations}}.',
    values: { count },
  });
export const PRIORITY_LABEL = i18n.translate(`${PREFIX}.priorityLabel`, {
  defaultMessage: 'Priority',
});
export const PRIORITY_WHY = i18n.translate(`${PREFIX}.priorityWhy`, { defaultMessage: 'Why?' });
export const PRIORITY_WHY_PLACEHOLDER = i18n.translate(`${PREFIX}.priorityWhyPlaceholder`, {
  defaultMessage: 'What changed? Saved with the change on each investigation.',
});
export const PRIORITY_CONFIRM = i18n.translate(`${PREFIX}.priorityConfirm`, {
  defaultMessage: 'Change priority',
});
export const PRIORITY_RUNNING = i18n.translate(`${PREFIX}.priorityRunning`, {
  defaultMessage: 'Changing priority',
});

/* Tags */
export const TAGS_TITLE = i18n.translate(`${PREFIX}.tagsTitle`, { defaultMessage: 'Add tags' });
export const TAGS_BODY = (count: number) =>
  i18n.translate(`${PREFIX}.tagsBody`, {
    defaultMessage:
      'Add these tags to {count, plural, one {# investigation} other {# investigations}}. Existing tags stay.',
    values: { count },
  });
export const TAGS_LABEL = i18n.translate(`${PREFIX}.tagsLabel`, { defaultMessage: 'Tags' });
export const TAGS_PLACEHOLDER = i18n.translate(`${PREFIX}.tagsPlaceholder`, {
  defaultMessage: 'Pick or type a tag and press Enter',
});
export const TAGS_REQUIRED = i18n.translate(`${PREFIX}.tagsRequired`, {
  defaultMessage: 'Add at least one tag.',
});
export const TAG_TOO_LONG = (max: number) =>
  i18n.translate(`${PREFIX}.tagTooLong`, {
    defaultMessage: 'A tag can be at most {max} characters.',
    values: { max },
  });
export const TAGS_CONFIRM = i18n.translate(`${PREFIX}.tagsConfirm`, {
  defaultMessage: 'Add tags',
});
export const TAGS_RUNNING = i18n.translate(`${PREFIX}.tagsRunning`, {
  defaultMessage: 'Adding tags',
});

/* Close */
export const CLOSE_TITLE = (count: number) =>
  i18n.translate(`${PREFIX}.closeTitle`, {
    defaultMessage: 'Close {count, plural, one {# investigation} other {# investigations}}',
    values: { count },
  });
export const CLOSE_BODY = i18n.translate(`${PREFIX}.closeBody`, {
  defaultMessage:
    'Every selected investigation is closed with this reason and these notes. An investigation that still has open required tasks or empty required fields is not closed, and the result list says which.',
});
export const CLOSE_CONFIRM = (count: number) =>
  i18n.translate(`${PREFIX}.closeConfirm`, {
    defaultMessage: 'Close {count, plural, one {# investigation} other {# investigations}}',
    values: { count },
  });
export const CLOSE_NOTES_HELP = i18n.translate(`${PREFIX}.closeNotesHelp`, {
  defaultMessage: 'Added as the closing notes and as a comment on each investigation.',
});
export const CLOSE_REASON_REQUIRED = i18n.translate(`${PREFIX}.closeReasonRequired`, {
  defaultMessage: 'Pick a close reason to continue.',
});
export const CLOSE_RUNNING = i18n.translate(`${PREFIX}.closeRunning`, {
  defaultMessage: 'Closing investigations',
});

/* Progress and results */
export const PROGRESS = (completed: number, total: number) =>
  i18n.translate(`${PREFIX}.progress`, {
    defaultMessage: '{completed} of {total} done',
    values: { completed, total },
  });
export const RESULTS_ARIA = i18n.translate(`${PREFIX}.resultsAria`, {
  defaultMessage: 'Result for each selected investigation',
});
export const RESULT_DONE = i18n.translate(`${PREFIX}.resultDone`, { defaultMessage: 'Done' });
export const RESULT_UNCHANGED = i18n.translate(`${PREFIX}.resultUnchanged`, {
  defaultMessage: 'No change needed',
});
export const RESULT_BLOCKED = i18n.translate(`${PREFIX}.resultBlocked`, {
  defaultMessage: 'Blocked',
});
export const RESULT_NO_MESSAGE = i18n.translate(`${PREFIX}.resultNoMessage`, {
  defaultMessage: 'The server did not say why.',
});
export const COLUMN_ID = i18n.translate(`${PREFIX}.columnId`, { defaultMessage: 'ID' });
export const COLUMN_TITLE = i18n.translate(`${PREFIX}.columnTitle`, { defaultMessage: 'Title' });
export const COLUMN_RESULT = i18n.translate(`${PREFIX}.columnResult`, {
  defaultMessage: 'Result',
});
export const COLUMN_REASON = i18n.translate(`${PREFIX}.columnReason`, {
  defaultMessage: 'Why it was blocked',
});
export const DONE_BUTTON = i18n.translate(`${PREFIX}.doneButton`, { defaultMessage: 'Done' });
export const SUMMARY_SOME_BLOCKED = (done: number, unchanged: number, blocked: number) =>
  i18n.translate(`${PREFIX}.summarySomeBlocked`, {
    defaultMessage:
      '{done} updated, {unchanged} needed no change, {blocked} blocked. Blocked investigations were left as they were.',
    values: { done, unchanged, blocked },
  });
export const SUMMARY_TOAST_DONE = (done: number, unchanged: number) =>
  i18n.translate(`${PREFIX}.summaryToastDone`, {
    defaultMessage: '{done} updated, {unchanged} needed no change.',
    values: { done, unchanged },
  });
export const SUMMARY_TOAST_BLOCKED = (done: number, blocked: number) =>
  i18n.translate(`${PREFIX}.summaryToastBlocked`, {
    defaultMessage: '{done} updated, {blocked} blocked. Open the result list to see why.',
    values: { done, blocked },
  });
