/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UserMessage } from '@kbn/lens-common';
import type { LensExtensionFailure } from './run_active_extensions';

/** Non-blocking badge shown when an extension overlay could not be loaded. */
export const getExtensionFailureMessage = ({
  extensionId,
  layerId,
  error,
}: LensExtensionFailure): UserMessage => ({
  uniqueId: `lens-extension-failure-${extensionId}-${layerId}`,
  severity: 'warning',
  fixableInEditor: false,
  displayLocations: [{ id: 'embeddableBadge' }],
  shortMessage: i18n.translate('xpack.lens.extensions.failure.shortMessage', {
    defaultMessage: 'Some chart details could not be loaded',
  }),
  longMessage: i18n.translate('xpack.lens.extensions.failure.longMessage', {
    defaultMessage: 'The chart is shown without the "{extensionId}" overlay: {message}',
    values: { extensionId, message: error.message },
  }),
});
