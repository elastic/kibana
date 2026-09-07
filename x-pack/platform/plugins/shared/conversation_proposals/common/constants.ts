/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONVERSATION_PROPOSALS_PLUGIN_ID = 'conversationProposals' as const;
export const CONVERSATION_PROPOSALS_PLUGIN_NAME = 'Conversation proposals' as const;

/**
 * The `.kibana-` prefix is deliberate and permanent: `.kibana*` is already
 * granted to the `kibana_system` role, so this index needs no Elasticsearch-side
 * system index registration. `anonymization` ships
 * `.kibana-anonymization-profiles` on the same reasoning.
 */
export const PROPOSALS_INDEX_NAME = '.kibana-conversation-proposals' as const;

export const PROPOSALS_INTERNAL_URL = '/internal/proposals' as const;
export const PROPOSAL_BY_ID_URL = `${PROPOSALS_INTERNAL_URL}/{id}` as const;
export const PROPOSAL_APPROVE_URL = `${PROPOSALS_INTERNAL_URL}/{id}/approve` as const;
export const PROPOSAL_DISMISS_URL = `${PROPOSALS_INTERNAL_URL}/{id}/dismiss` as const;

export const PROPOSALS_API_PRIVILEGE_READ = 'proposals_read' as const;
export const PROPOSALS_API_PRIVILEGE_WRITE = 'proposals_write' as const;

export const PROPOSALS_API_VERSION = '1' as const;

/** Owner id used when registering managed workflows for this plugin. */
export const PROPOSALS_MANAGED_WORKFLOW_OWNER_ID = 'conversationProposals' as const;

/**
 * Tag every action workflow carries so the catalog can be discovered without a
 * hardcoded list. Deliberately solution-agnostic.
 */
export const ACTION_WORKFLOW_TAG = 'action' as const;

/** Channel recorded on the workflow resume, for audit. */
export const PROPOSALS_RESUME_CHANNEL = 'conversation_proposals_api' as const;
