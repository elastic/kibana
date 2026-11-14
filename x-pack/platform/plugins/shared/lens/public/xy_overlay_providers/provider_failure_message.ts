/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UserMessage } from '@kbn/lens-common';
import type { XYOverlayProviderFailure } from './run_active_providers';

/** Non-blocking badge shown when an XY overlay could not be loaded. */
export const getXYOverlayProviderFailureMessage = ({
  providerId,
  layerId,
  error,
}: XYOverlayProviderFailure): UserMessage => ({
  uniqueId: `lens-xy-overlay-provider-failure-${providerId}-${layerId}`,
  severity: 'warning',
  fixableInEditor: false,
  displayLocations: [{ id: 'embeddableBadge' }],
  shortMessage: i18n.translate('xpack.lens.xyOverlayProviders.failure.shortMessage', {
    defaultMessage: 'Some chart details could not be loaded',
  }),
  longMessage: i18n.translate('xpack.lens.xyOverlayProviders.failure.longMessage', {
    defaultMessage: 'The chart is shown without the "{providerId}" overlay: {message}',
    values: { providerId, message: error.message },
  }),
});
