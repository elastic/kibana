/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UserMessage } from '@kbn/lens-common';
import {
  MAX_XY_OVERLAY_POINTS,
  type XYOverlayProviderFailure,
  type XYOverlayTruncation,
} from './run_active_providers';

const MESSAGE_ID_PREFIX = 'lens-xy-overlay-provider-';

/** Tells apart the messages added for XY overlays, so they can be cleared on every overlay load. */
export const isXYOverlayProviderMessageId = (uniqueId: string): boolean =>
  uniqueId.startsWith(MESSAGE_ID_PREFIX);

/** Non-blocking badge shown when an overlay returned more points than Lens draws. */
export const getXYOverlayTruncationMessage = ({
  providerId,
  layerId,
  pointCount,
}: XYOverlayTruncation): UserMessage => ({
  uniqueId: `${MESSAGE_ID_PREFIX}truncation-${providerId}-${layerId}`,
  severity: 'warning',
  fixableInEditor: false,
  displayLocations: [{ id: 'embeddableBadge' }],
  shortMessage: i18n.translate('xpack.lens.xyOverlayProviders.truncation.shortMessage', {
    defaultMessage: 'Some chart details are incomplete',
  }),
  longMessage: i18n.translate('xpack.lens.xyOverlayProviders.truncation.longMessage', {
    defaultMessage: 'The "{providerId}" overlay shows the first {limit} of {pointCount} points.',
    values: { providerId, limit: MAX_XY_OVERLAY_POINTS, pointCount },
  }),
});

/** Non-blocking badge shown when an XY overlay could not be loaded. */
export const getXYOverlayProviderFailureMessage = ({
  providerId,
  layerId,
  error,
}: XYOverlayProviderFailure): UserMessage => ({
  uniqueId: `${MESSAGE_ID_PREFIX}failure-${providerId}-${layerId}`,
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
