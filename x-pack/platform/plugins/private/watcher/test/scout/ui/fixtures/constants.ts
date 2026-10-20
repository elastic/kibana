/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const WATCHER_TAGS = ['@local-stateful-classic', '@cloud-stateful-classic'];

/**
 * Replaces the original FTR's `setRoles(['kibana_admin', 'watcher_admin'])`.
 * Defined as a single custom role because `loginWithBuiltInRole` provisions only
 * one built-in role at a time, and `watcher_admin` alone carries no Kibana
 * privileges (so the user couldn't reach Stack Management). This combines the
 * `watcher_admin` cluster/index privileges with Kibana `base: ['all']` (the
 * `kibana_admin` half) to exercise the same access the FTR did.
 */
export const WATCHER_ADMIN_ROLE = {
  elasticsearch: {
    cluster: ['manage', 'monitor', 'manage_watcher', 'monitor_watcher'],
    indices: [
      {
        names: ['.watches', 'watcher-*', '.triggered_watches', '.watcher-history-*'],
        privileges: ['all'],
        allow_restricted_indices: true,
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
