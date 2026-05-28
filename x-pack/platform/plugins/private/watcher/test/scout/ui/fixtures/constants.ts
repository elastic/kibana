/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';

export const WATCHER_TAGS = [...tags.stateful.classic];

/**
 * Mirrors the built-in `watcher_admin` Elasticsearch role.
 * Grants full cluster watcher management + all Kibana features.
 */
export const WATCHER_ADMIN_ROLE = {
  elasticsearch: {
    cluster: ['manage', 'monitor', 'manage_watcher', 'monitor_watcher'],
    indices: [
      {
        names: ['.watches', 'watcher-*', '.triggered_watches', '.watcher-history-*'],
        privileges: ['all'],
      },
    ],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

/**
 * A11y scope selectors.
 * EUI modals and flyouts render in portals outside `.kbnAppWrapper`,
 * so both selectors are required to catch violations in dialogs.
 */
export const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

export const WATCH_ID = 'scout-test-watch';
export const WATCH_NAME = 'Scout Test Watch';
