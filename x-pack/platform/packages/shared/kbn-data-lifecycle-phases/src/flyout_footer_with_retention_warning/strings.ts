/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Keep the existing translation IDs for backwards compatibility.
const EDIT_FLYOUT_PREFIX = 'xpack.dataLifecyclePhases.editDataLifecycleFlyout';

export const flyoutFooterWithRetentionWarningStrings = {
  cancelButton: i18n.translate(`${EDIT_FLYOUT_PREFIX}.cancelButton`, { defaultMessage: 'Cancel' }),
  applyButton: i18n.translate(`${EDIT_FLYOUT_PREFIX}.applyButton`, { defaultMessage: 'Apply' }),
  downsamplingNotAppliedTitle: i18n.translate(`${EDIT_FLYOUT_PREFIX}.downsamplingNotAppliedTitle`, {
    defaultMessage: 'Downsampling requires a time series stream',
  }),
  downsamplingNotAppliedBody: i18n.translate(`${EDIT_FLYOUT_PREFIX}.downsamplingNotAppliedBody`, {
    defaultMessage:
      'As this stream is not a time series, downsampling steps from the imported lifecycles will be excluded.',
  }),
};
