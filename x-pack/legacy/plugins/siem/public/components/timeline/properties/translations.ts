/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TIMELINE_DESCRIPTION = i18n.translate(
  'xpack.siem.timeline.properties.timelineDescription',
  {
    defaultMessage: 'Timeline Description',
  }
);

export const TITLE = i18n.translate('xpack.siem.timeline.properties.titleTitle', {
  defaultMessage: 'Title',
});

export const FAVORITE = i18n.translate('xpack.siem.timeline.properties.favoriteTooltip', {
  defaultMessage: 'Favorite',
});

export const NOT_A_FAVORITE = i18n.translate('xpack.siem.timeline.properties.notAFavoriteTooltip', {
  defaultMessage: 'Not a Favorite',
});

export const TIMELINE_TITLE = i18n.translate(
  'xpack.siem.timeline.properties.timelineTitleAriaLabel',
  {
    defaultMessage: 'Timeline title',
  }
);

export const INSPECT_TIMELINE_TITLE = i18n.translate(
  'xpack.siem.timeline.properties.inspectTimelineTitle',
  {
    defaultMessage: 'Timeline',
  }
);

export const UNTITLED_TIMELINE = i18n.translate(
  'xpack.siem.timeline.properties.untitledTimelinePlaceholder',
  {
    defaultMessage: 'Untitled Timeline',
  }
);

export const DESCRIPTION = i18n.translate('xpack.siem.timeline.properties.descriptionPlaceholder', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_TOOL_TIP = i18n.translate(
  'xpack.siem.timeline.properties.descriptionTooltip',
  {
    defaultMessage: 'A summary of the events and notes in this Timeline',
  }
);

export const HISTORY = i18n.translate('xpack.siem.timeline.properties.historyLabel', {
  defaultMessage: 'History',
});

export const IS_VIEWING = i18n.translate('xpack.siem.timeline.properties.isViewingTooltip', {
  defaultMessage: 'is viewing this Timeline',
});

export const NOTES = i18n.translate('xpack.siem.timeline.properties.notesButtonLabel', {
  defaultMessage: 'Notes',
});

export const NOTES_TOOL_TIP = i18n.translate('xpack.siem.timeline.properties.notesToolTip', {
  defaultMessage: 'Add and review notes about this Timeline. Notes may also be added to events.',
});

export const HISTORY_TOOL_TIP = i18n.translate('xpack.siem.timeline.properties.historyToolTip', {
  defaultMessage: 'The chronological history of actions related to this timeline',
});

export const STREAM_LIVE_TOOL_TIP = i18n.translate(
  'xpack.siem.timeline.properties.streamLiveToolTip',
  {
    defaultMessage: 'Update the Timeline as new data arrives',
  }
);

export const NEW_TIMELINE = i18n.translate(
  'xpack.siem.timeline.properties.newTimelineButtonLabel',
  {
    defaultMessage: 'Create New Timeline',
  }
);

export const STREAM_LIVE = i18n.translate('xpack.siem.timeline.properties.streamLiveButtonLabel', {
  defaultMessage: 'Stream Live',
});

export const LOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.siem.timeline.properties.lockDatePickerTooltip',
  {
    defaultMessage:
      'Disable syncing of date/time range between the currently viewed page and your timeline',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_TOOL_TIP = i18n.translate(
  'xpack.siem.timeline.properties.unlockDatePickerTooltip',
  {
    defaultMessage:
      'Enable syncing of date/time range between the currently viewed page and your timeline',
  }
);

export const LOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.siem.timeline.properties.lockDatePickerDescription',
  {
    defaultMessage: 'Lock date picker to global date picker',
  }
);

export const UNLOCK_SYNC_MAIN_DATE_PICKER_ARIA = i18n.translate(
  'xpack.siem.timeline.properties.unlockDatePickerDescription',
  {
    defaultMessage: 'Unlock date picker to global date picker',
  }
);
