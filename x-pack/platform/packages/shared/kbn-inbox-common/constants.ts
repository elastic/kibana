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

/**
 * Parameterized template for the respond-to-action route. Use
 * `buildRespondToActionUrl(sourceApp, sourceId)` to construct a concrete URL.
 */
export const INBOX_ACTION_RESPOND_URL_TEMPLATE =
  `${INBOX_ACTIONS_URL}/{source_app}/{source_id}/respond` as const;

export const buildRespondToActionUrl = (sourceApp: string, sourceId: string) =>
  `${INBOX_ACTIONS_URL}/${encodeURIComponent(sourceApp)}/${encodeURIComponent(sourceId)}/respond`;

/**
 * Surfaces through which a response can be submitted. Aligns with the HITL
 * GA epic's channel tracking ([security-team#16709](https://github.com/elastic/security-team/issues/16709)
 * and the channel extensibility plan [security-team#16712](https://github.com/elastic/security-team/issues/16712)).
 */
export const INBOX_CHANNELS = {
  inbox: 'inbox',
  kibanaExecutionView: 'kibana_execution_view',
  agentBuilder: 'agent_builder',
  slack: 'slack',
  api: 'api',
} as const;
export type InboxChannel = (typeof INBOX_CHANNELS)[keyof typeof INBOX_CHANNELS];

export const INBOX_RESPONSE_MODES = ['pending', 'responded', 'timed_out'] as const;
export type InboxResponseMode = (typeof INBOX_RESPONSE_MODES)[number];

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
