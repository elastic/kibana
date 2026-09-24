/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

export const ESCALATIONS_INTERNAL_URL =
  `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/escalations` as const;
export const ESCALATION_BY_ID_URL = `${ESCALATIONS_INTERNAL_URL}/{id}` as const;
export const ESCALATIONS_SUGGEST_USERS_URL =
  `${ESCALATIONS_INTERNAL_URL}/_suggest_user_profiles` as const;

/** Template ids. Owned by agent_builder_platform; referenced here for guard checks. */
export const ESCALATION_TEMPLATE_ID = 'escalation' as const;
export const INVESTIGATION_TEMPLATE_ID = 'investigation' as const;

/** The escalation template field that holds linked investigation conversation ids. */
export const ESCALATION_LINKED_INVESTIGATIONS_FIELD = 'linked_investigations' as const;

/**
 * An escalation must never list more linked investigations than this. Chosen to match
 * CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES (100) so a private escalation can have one
 * collaborator per linked investigation without hitting a separate limit.
 */
export const MAX_ESCALATION_LINKED_INVESTIGATIONS = 100;

/**
 * UI capabilities. Capabilities are namespaced by feature id rather than by
 * sub-feature, so each entity scopes its own names.
 */
export const ESCALATIONS_UI_CAPABILITY_SHOW = 'showEscalations' as const;
export const ESCALATIONS_UI_CAPABILITY_MANAGE = 'manageEscalations' as const;

/**
 * Pagination bounds for the list endpoint.
 *
 * These mirror agent_builder's MAX_CONVERSATION_SEARCH_PER_PAGE (50) and
 * MAX_RESULT_WINDOW (10_000), which live in that plugin's own common/ and are
 * not importable cross-plugin. They are intentionally kept in sync with those
 * upstream values — update here if agent_builder changes them.
 */
export const MAX_ESCALATIONS_PAGE_SIZE = 50;
export const MAX_ESCALATIONS_RESULT_WINDOW = 10_000;
