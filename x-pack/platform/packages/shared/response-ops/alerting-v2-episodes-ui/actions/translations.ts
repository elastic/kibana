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
  defaultMessage: 'Edit alert tags',
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
    defaultMessage: 'Edit alert tags',
  }
);

export const CANCEL = i18n.translate('xpack.alertingV2.episodesUi.tagsAction.cancel', {
  defaultMessage: 'Cancel',
});

export const RESOLVE_ACTION_REASON = i18n.translate(
  'xpack.alertingV2.episodesUi.resolveAction.reason',
  {
    defaultMessage: 'Updated from alerts actions UI',
  }
);

export const getBulkErrorDetailsHeading = (failed: number): string =>
  i18n.translate('xpack.alertingV2Episodes.actions.bulkErrorDetailsHeadingErrorMessage', {
    defaultMessage: 'The action failed for {failed, plural, one {# alert} other {# alerts}}.',
    values: { failed },
  });

export const getBulkTotalFailureToast = (actionName: string, failed: number): string =>
  i18n.translate('xpack.alertingV2Episodes.actions.bulkTotalFailureToastErrorMessage', {
    defaultMessage: '{actionName} failed for {failed, plural, one {# alert} other {# alerts}}.',
    values: { actionName, failed },
  });

export const getBulkPartialFailureToast = (actionName: string, failed: number): string =>
  i18n.translate('xpack.alertingV2Episodes.actions.bulkPartialFailureToastErrorMessage', {
    defaultMessage: '{actionName} completed with {failed, plural, one {# error} other {# errors}}.',
    values: { actionName, failed },
  });

export const getBulkFailureReason = (reason: string, additionalReasons: number): string =>
  i18n.translate('xpack.alertingV2Episodes.actions.bulkFailureReasonErrorMessage', {
    defaultMessage:
      '{reason}{additionalReasons, plural, =0 {} one { (+# more reason)} other { (+# more reasons)}}',
    values: { reason, additionalReasons },
  });

export const UNKNOWN_ERROR = i18n.translate(
  'xpack.alertingV2Episodes.actions.unknownBulkErrorMessage',
  { defaultMessage: 'Unknown error' }
);

export const getBulkSuccessToast = (processed: number): string =>
  i18n.translate('xpack.alertingV2Episodes.actions.bulkSuccessToast', {
    defaultMessage: '{processed, plural, one {# alert} other {# alerts}} updated successfully.',
    values: { processed },
  });

export const BULK_NO_CHANGES_TOAST = i18n.translate(
  'xpack.alertingV2Episodes.actions.bulkNoChangesToast',
  {
    defaultMessage: 'No changes were needed.',
  }
);

export const UNRESOLVE_NOT_AVAILABLE = i18n.translate(
  'xpack.alertingV2Episodes.actions.unresolveNotAvailable',
  {
    defaultMessage: 'Unresolve is not available for classic alerts',
  }
);

export const ADD_TO_CASE = i18n.translate('xpack.alertingV2.episodesUi.addToCaseAction.addToCase', {
  defaultMessage: 'Add to case',
});

export const NO_ALERTS_ADDED_TO_CASE = i18n.translate(
  'xpack.alertingV2.episodesUi.addToCaseAction.noAlertsAddedTitle',
  {
    defaultMessage: 'No alerts added to the case',
  }
);

export const ALERTS_ALREADY_ATTACHED_TO_CASE = i18n.translate(
  'xpack.alertingV2.episodesUi.addToCaseAction.alertsAlreadyAttached',
  {
    defaultMessage: 'All selected alerts are already attached to the case',
  }
);

export const EDIT_ASSIGNEE_NOT_AVAILABLE = i18n.translate(
  'xpack.alertingV2Episodes.actions.editAssigneeNotAvailable',
  {
    defaultMessage: 'Edit assignee is not available for classic alerts',
  }
);
