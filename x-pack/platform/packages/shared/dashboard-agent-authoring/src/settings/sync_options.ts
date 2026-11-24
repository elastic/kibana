/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import type { DashboardFailure } from '../utils';
import type { UpsertOptions } from './schema';

const TOOLTIP_SYNC_WITHOUT_CURSOR_SYNC_ERROR =
  'Tooltip sync was not changed because it works only while cursor sync is on, and the dashboard has cursor sync off. Ask the user whether to turn cursor sync on as well.';

const CONFLICTING_SYNC_OPTIONS_ERROR =
  'Changes to "options.sync_cursor" and "options.sync_tooltips" were not applied because they conflict: tooltip sync works only while cursor sync is on. Ask the user which they want, then send a consistent pair (both true, or sync_cursor: false alone).';

const withoutTooltipSync = ({ sync_tooltips: _tooltipSync, ...options }: UpsertOptions) => options;

const withoutSyncOptions = ({
  sync_cursor: _cursorSync,
  sync_tooltips: _tooltipSync,
  ...options
}: UpsertOptions) => options;

/**
 * Decides which of the call's options to apply, so the call does not turn tooltip sync on while
 * cursor sync is off, where it has no effect: that change is left out with a failure, and so is a
 * cursor sync off change in the same call, since the two conflict. Turning cursor sync off alone
 * also turns tooltip sync off, as the settings flyout does.
 */
export const planSyncOptions = ({
  originalOptions,
  requestedOptions,
}: {
  originalOptions: DashboardAttachmentData['options'];
  requestedOptions: UpsertOptions | undefined;
}): { options: UpsertOptions | undefined; failure?: DashboardFailure } => {
  if (requestedOptions === undefined) {
    return { options: requestedOptions };
  }
  const { sync_cursor: requestedCursorSync, sync_tooltips: requestedTooltipSync } =
    requestedOptions;
  // Unset means on, so only an explicit false turns cursor sync off.
  const cursorSync = requestedCursorSync ?? originalOptions?.sync_cursor;

  if (requestedTooltipSync === true && cursorSync === false) {
    const isConflict = requestedCursorSync === false;
    const remainingOptions = isConflict
      ? withoutSyncOptions(requestedOptions)
      : withoutTooltipSync(requestedOptions);
    return {
      // An empty object would still give the dashboard an options object it did not have.
      options: isEmpty(remainingOptions) ? undefined : remainingOptions,
      failure: {
        type: DASHBOARD_FAILURE_TYPES.upsertDashboard,
        kind: 'dashboard',
        identifier: 'options.sync_tooltips',
        error: isConflict ? CONFLICTING_SYNC_OPTIONS_ERROR : TOOLTIP_SYNC_WITHOUT_CURSOR_SYNC_ERROR,
      },
    };
  }

  if (requestedCursorSync === false && originalOptions?.sync_tooltips === true) {
    return { options: { ...requestedOptions, sync_tooltips: false } };
  }

  return { options: requestedOptions };
};
