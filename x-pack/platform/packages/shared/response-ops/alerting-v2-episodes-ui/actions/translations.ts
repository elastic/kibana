/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VIEW_DETAILS = i18n.translate('xpack.alertingV2.episodesUi.actions.viewDetailsLabel', {
  defaultMessage: 'View details',
});

export const ACK = i18n.translate('xpack.alertingV2.episodesUi.acknowledgeAction.acknowledge', {
  defaultMessage: 'Acknowledge',
});

export const UNACK = i18n.translate('xpack.alertingV2.episodesUi.acknowledgeAction.unacknowledge', {
  defaultMessage: 'Unacknowledge',
});

export const SNOOZE = i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.snooze', {
  defaultMessage: 'Snooze',
});

export const UNSNOOZE = i18n.translate('xpack.alertingV2.episodesUi.snoozeAction.unsnooze', {
  defaultMessage: 'Unsnooze',
});

export const RESOLVE = i18n.translate('xpack.alertingV2.episodesUi.resolveAction.deactivate', {
  defaultMessage: 'Resolve',
});

export const UNRESOLVE = i18n.translate('xpack.alertingV2.episodesUi.resolveAction.activate', {
  defaultMessage: 'Unresolve',
});

export const EDIT_TAGS = i18n.translate('xpack.alertingV2.episodesUi.tagsAction.editTags', {
  defaultMessage: 'Edit Tags',
});

export const EDIT_ASSIGNEE = i18n.translate(
  'xpack.alertingV2.episodesUi.assigneeAction.editAssignee',
  {
    defaultMessage: 'Edit assignee',
  }
);

export const OPEN_IN_DISCOVER = i18n.translate(
  'xpack.alertingV2.episodesUi.actions.openInDiscoverLabel',
  {
    defaultMessage: 'Open in Discover',
  }
);

export const TAGS_FLYOUT_TITLE = i18n.translate(
  'xpack.alertingV2.episodesUi.tagsAction.flyoutTitle',
  {
    defaultMessage: 'Edit Tags',
  }
);

export const CANCEL = i18n.translate('xpack.alertingV2.episodesUi.tagsAction.cancel', {
  defaultMessage: 'Cancel',
});

export const RESOLVE_ACTION_REASON = i18n.translate(
  'xpack.alertingV2.episodesUi.resolveAction.reason',
  {
    defaultMessage: 'Updated from episodes actions UI',
  }
);

export const BULK_ERROR_TOAST = i18n.translate('xpack.alertingV2Episodes.actions.bulkErrorToast', {
  defaultMessage: 'An error occurred while performing the bulk action.',
});

export const getBulkSuccessToast = (processed: number): string =>
  i18n.translate('xpack.alertingV2Episodes.actions.bulkSuccessToast', {
    defaultMessage: '{processed, plural, one {# episode} other {# episodes}} updated successfully.',
    values: { processed },
  });

export const getBulkPartialSuccessToast = (processed: number, total: number): string =>
  i18n.translate('xpack.alertingV2Episodes.actions.bulkPartialSuccessToast', {
    defaultMessage:
      '{processed} of {total} {total, plural, one {episode} other {episodes}} updated successfully.',
    values: { processed, total },
  });
