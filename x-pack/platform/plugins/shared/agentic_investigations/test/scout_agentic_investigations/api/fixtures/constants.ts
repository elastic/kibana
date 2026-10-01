/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

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
export const ESCALATION_ASSIGNEES_PATH = (id: string) =>
  `internal/investigations/escalations/${id}/assignees`;

export const INVESTIGATIONS_INTERNAL_PATH = 'internal/investigations/investigations';
export const INVESTIGATION_ASSIGNEES_PATH = (id: string) =>
  `internal/investigations/investigations/${id}/assignees`;

/** Agent Builder public conversations API. */
export const AB_CONVERSATIONS_PATH = 'api/agent_builder/conversations';
export const AB_CONVERSATION_BY_ID_PATH = (id: string) => `api/agent_builder/conversations/${id}`;

/** Investigations query API, and the impact route that seeds side-index documents. */
export const INVESTIGATIONS_PATH = 'internal/investigations/investigations';
export const INVESTIGATION_BY_ID_PATH = (id: string) => `${INVESTIGATIONS_PATH}/${id}`;
export const INVESTIGATIONS_SEVERITY_COUNTS_PATH = `${INVESTIGATIONS_PATH}/_severity_counts`;
export const IMPACT_PATH = 'internal/investigations/impact';

/** Agent Builder without any agentic investigations privilege. */
export const NO_INVESTIGATIONS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { agentBuilder: ['all'] }, spaces: ['*'] }],
};

/** Base Read of agentic investigations: `read_investigations`, no `manage_investigations`. */
export const INVESTIGATIONS_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { agenticInvestigations: ['read'], agentBuilder: ['read'] },
      spaces: ['*'],
    },
  ],
};
