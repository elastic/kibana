/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultLogViewsStaticConfig, LogViewAttributes } from './types';

export const defaultLogViewId = 'default';
export const defaultFilterStateKey = 'logFilter';
export const defaultPositionStateKey = 'logPosition'; // NOTE: Provides backwards compatibility for start / end / streamLive previously stored under the logPosition key.

export const DEFAULT_REFRESH_INTERVAL = { pause: true, value: 5000 };

export const defaultLogViewAttributes: LogViewAttributes = {
  name: 'Log View',
  description: 'A default log view',
  logIndices: {
    type: 'kibana_advanced_setting',
  },
  logColumns: [
    {
      timestampColumn: {
        id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
      },
    },
    {
      fieldColumn: {
        id: 'eb9777a8-fcd3-420e-ba7d-172fff6da7a2',
        field: 'event.dataset',
      },
    },
    {
      messageColumn: {
        id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
      },
    },
  ],
};

export const defaultLogViewsStaticConfig: DefaultLogViewsStaticConfig = {
  messageFields: ['message', '@message'],
};

export const DEFAULT_LOG_VIEW = {
  type: 'log-view-reference' as const,
  logViewId: defaultLogViewId,
};
