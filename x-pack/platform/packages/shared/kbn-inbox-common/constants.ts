/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INBOX_FEATURE_ID = 'inbox' as const;
export const INBOX_PLUGIN_NAME = 'Inbox' as const;

export const INBOX_INTERNAL_URL = '/internal/inbox' as const;
export const INBOX_ACTIONS_URL = `${INBOX_INTERNAL_URL}/actions` as const;

export const API_VERSIONS = {
  internal: {
    v1: '1',
  },
} as const;

export const INTERNAL_API_ACCESS = 'internal' as const;

export const INBOX_ACTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type InboxActionStatus = (typeof INBOX_ACTION_STATUSES)[number];

export const MAX_INBOX_ACTIONS_PER_PAGE = 100;
export const DEFAULT_INBOX_ACTIONS_PER_PAGE = 25;
