/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SortOrder, CursorDirection } from '../graphql/types';

/**
 * The Uptime UI utilizes a settings context, the defaults for which are stored here.
 */
export const CONTEXT_DEFAULTS = {
  /**
   * The application's autorefresh feature is enabled.
   */
  AUTOREFRESH_IS_PAUSED: true,
  /**
   * The application autorefreshes every 10s by default.
   */
  AUTOREFRESH_INTERVAL: 10000,
  /**
   * The application cannot assume a basepath.
   */
  BASE_PATH: '',
  /**
   * The beginning of the default date range is 15m ago.
   */
  DATE_RANGE_START: 'now-15m',
  /**
   * The end of the default date range is now.
   */
  DATE_RANGE_END: 'now',

  CURSOR_PAGINATION: {
    cursorDirection: CursorDirection.AFTER,
    sortOrder: SortOrder.ASC,
  },

  /**
   * Defines the maximum number of monitors to iterate on
   * in a single count session. The intention is to catch as many as possible.
   */
  MAX_MONITORS_FOR_SNAPSHOT_COUNT: 1000000,
};
