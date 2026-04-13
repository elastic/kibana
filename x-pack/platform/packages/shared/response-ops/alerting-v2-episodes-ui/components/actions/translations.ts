/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** --- Acknowledge action --- */
export const ACKNOWLEDGE_ACTION_ACKNOWLEDGE = i18n.translate(
  'xpack.alertingV2.episodesUi.acknowledgeAction.acknowledge',
  {
    defaultMessage: 'Acknowledge',
  }
);

export const ACKNOWLEDGE_ACTION_UNACKNOWLEDGE = i18n.translate(
  'xpack.alertingV2.episodesUi.acknowledgeAction.unacknowledge',
  {
    defaultMessage: 'Unacknowledge',
  }
);

/** --- Actions container --- */
export const ACTIONS_MORE_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.actions.moreActionsAriaLabel',
  {
    defaultMessage: 'More actions',
  }
);

export const ACTIONS_VIEW_DETAILS_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.actions.viewDetailsLabel',
  {
    defaultMessage: 'View details',
  }
);

/** --- Open in Discover action --- */
export const ACTIONS_OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.actions.openInDiscoverLabel',
  {
    defaultMessage: 'Open in Discover',
  }
);

/** --- Resolve action --- */
export const RESOLVE_ACTION_ACTIVATE = i18n.translate(
  'xpack.alertingV2.episodesUi.resolveAction.activate',
  {
    defaultMessage: 'Unresolve',
  }
);

export const RESOLVE_ACTION_DEACTIVATE = i18n.translate(
  'xpack.alertingV2.episodesUi.resolveAction.deactivate',
  {
    defaultMessage: 'Resolve',
  }
);

export const RESOLVE_ACTION_REASON = i18n.translate(
  'xpack.alertingV2.episodesUi.resolveAction.reason',
  {
    defaultMessage: 'Updated from episodes actions UI',
  }
);

/** --- Snooze action --- */
export const SNOOZE_ACTION_UNSNOOZE = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeAction.unsnooze',
  {
    defaultMessage: 'Unsnooze',
  }
);

export const SNOOZE_ACTION_SNOOZE = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeAction.snooze',
  {
    defaultMessage: 'Snooze',
  }
);

export const SNOOZE_ACTION_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeAction.popoverAriaLabel',
  {
    defaultMessage: 'Snooze actions',
  }
);

/** --- Snooze form --- */
export const SNOOZE_FORM_MINUTES = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.minutes',
  {
    defaultMessage: 'Minutes',
  }
);

export const SNOOZE_FORM_HOURS = i18n.translate('xpack.alertingV2.episodesUi.snoozeForm.hours', {
  defaultMessage: 'Hours',
});

export const SNOOZE_FORM_DAYS = i18n.translate('xpack.alertingV2.episodesUi.snoozeForm.days', {
  defaultMessage: 'Days',
});

export const SNOOZE_FORM_PRESET_1H = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.preset.1h',
  {
    defaultMessage: '1 hour',
  }
);

export const SNOOZE_FORM_PRESET_3H = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.preset.3h',
  {
    defaultMessage: '3 hours',
  }
);

export const SNOOZE_FORM_PRESET_8H = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.preset.8h',
  {
    defaultMessage: '8 hours',
  }
);

export const SNOOZE_FORM_PRESET_1D = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.preset.1d',
  {
    defaultMessage: '1 day',
  }
);

export const SNOOZE_FORM_TITLE = i18n.translate('xpack.alertingV2.episodesUi.snoozeForm.title', {
  defaultMessage: 'Snooze notifications',
});

export const SNOOZE_FORM_DURATION_VALUE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.durationValueAriaLabel',
  {
    defaultMessage: 'Snooze duration value',
  }
);

export const SNOOZE_FORM_UNIT_SELECT_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.unitSelectAriaLabel',
  {
    defaultMessage: 'Snooze duration unit',
  }
);

export const SNOOZE_FORM_APPLY = i18n.translate('xpack.alertingV2.episodesUi.snoozeForm.apply', {
  defaultMessage: 'Apply',
});

export const SNOOZE_FORM_COMMONLY_USED = i18n.translate(
  'xpack.alertingV2.episodesUi.snoozeForm.commonlyUsed',
  {
    defaultMessage: 'Commonly used',
  }
);

/** --- Tag badges (list cell) --- */
export const TAGS_MORE_BADGE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.tags.moreTags.ariaLabel',
  {
    defaultMessage: 'more tags badge',
  }
);

export const TAGS_MORE_POPOVER_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodesUi.tags.moreTagsAriaLabel',
  {
    defaultMessage: 'more tags',
  }
);

/** --- Tags flyout & toolbar --- */
export const TAGS_ACTION_EDIT_TAGS = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.editTags',
  {
    defaultMessage: 'Edit Tags',
  }
);

export const TAGS_ACTION_FLYOUT_TITLE = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.flyoutTitle',
  {
    defaultMessage: 'Edit Tags',
  }
);

export const getTagsActionAddNewOptionLabel = (tag: string) =>
  i18n.translate('xpack.alertingV2.episodesUi.tagsAction.addNewTagOption', {
    defaultMessage: 'Add "{tag}" as a new tag',
    values: { tag },
  });

export const TAGS_ACTION_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.searchPlaceholder',
  {
    defaultMessage: 'Search or add a tag',
  }
);

export const TAGS_ACTION_EMPTY_TAGS = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.emptyTags',
  {
    defaultMessage: 'No tags yet',
  }
);

export const TAGS_ACTION_NO_MATCHES = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.noMatches',
  {
    defaultMessage: 'No matches',
  }
);

export const TAGS_ACTION_TAG_TOO_LONG_TITLE = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.tagTooLongTitle',
  {
    defaultMessage: 'Tag length limit exceeded',
  }
);

export const getTagsActionTagTooLongBody = (maxLength: number) =>
  i18n.translate('xpack.alertingV2.episodesUi.tagsAction.tagTooLongBody', {
    defaultMessage:
      'One or more selected tags exceed the maximum length of {maxLength} characters.',
    values: { maxLength },
  });

export const TAGS_ACTION_TOO_MANY_TAGS_TITLE = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.tooManyTagsTitle',
  {
    defaultMessage: 'Maximum number of tags selected',
  }
);

export const getTagsActionTooManyTagsBody = (maxTags: number) =>
  i18n.translate('xpack.alertingV2.episodesUi.tagsAction.tooManyTagsBody', {
    defaultMessage: 'You can save at most {maxTags} tags per episode.',
    values: { maxTags },
  });

export const TAGS_ACTION_CANCEL = i18n.translate('xpack.alertingV2.episodesUi.tagsAction.cancel', {
  defaultMessage: 'Cancel',
});

export const TAGS_ACTION_SAVE = i18n.translate('xpack.alertingV2.episodesUi.tagsAction.save', {
  defaultMessage: 'Save',
});

export const getTagsActionTotalTagsLabel = (totalTags: number) =>
  i18n.translate('xpack.alertingV2.episodesUi.tagsAction.totalTags', {
    defaultMessage: 'Total tags: {totalTags}',
    values: { totalTags },
  });

export const getTagsActionSelectedTagsLabel = (selectedTags: number) =>
  i18n.translate('xpack.alertingV2.episodesUi.tagsAction.selectedTagsLabel', {
    defaultMessage: 'Selected: {selectedTags}',
    values: { selectedTags },
  });

export const TAGS_ACTION_SELECT_ALL = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.selectAll',
  {
    defaultMessage: 'Select all',
  }
);

export const TAGS_ACTION_SELECT_NONE = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.selectNone',
  {
    defaultMessage: 'Select none',
  }
);
