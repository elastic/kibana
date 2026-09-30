/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

/** Headers for the Agent Builder public API (version date, no internal-origin required). */
export const PUBLIC_HEADERS = {
  'kbn-xsrf': 'scout',
  'elastic-api-version': '2023-10-31',
} as const;

export const LIST_ESCALATIONS_PATH = 'internal/investigations/escalations';
export const CREATE_ESCALATION_PATH = 'internal/investigations/escalations';
export const ESCALATION_BY_ID_PATH = (id: string) => `internal/investigations/escalations/${id}`;

/** Agent Builder public conversations API. */
export const AB_CONVERSATIONS_PATH = 'api/agent_builder/conversations';
export const AB_CONVERSATION_BY_ID_PATH = (id: string) => `api/agent_builder/conversations/${id}`;
