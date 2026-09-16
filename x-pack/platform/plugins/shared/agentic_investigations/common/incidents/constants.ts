/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

export const INCIDENTS_INTERNAL_URL =
  `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/incidents` as const;
export const INCIDENT_BY_ID_URL = `${INCIDENTS_INTERNAL_URL}/{id}` as const;

/** Template ids. Owned by agent_builder_platform; referenced here for guard checks. */
export const INCIDENT_TEMPLATE_ID = 'incident' as const;
export const INVESTIGATION_TEMPLATE_ID = 'investigation' as const;

/** The incident template field that holds linked investigation conversation ids. */
export const INCIDENT_LINKED_INVESTIGATIONS_FIELD = 'linked_investigations' as const;

/**
 * An incident must never list more linked investigations than this. Chosen to match
 * CONVERSATION_ACCESS_CONTROL_MAX_ENTRIES (100) so a private incident can have one
 * collaborator per linked investigation without hitting a separate limit.
 */
export const MAX_INCIDENT_LINKED_INVESTIGATIONS = 100;

/**
 * UI capabilities. Capabilities are namespaced by feature id rather than by
 * sub-feature, so each entity scopes its own names.
 * There is no `showIncidents` yet — the read / list route is deferred to a
 * follow-up ticket gated on elastic/kibana#290659.
 */
export const INCIDENTS_UI_CAPABILITY_MANAGE = 'manageIncidents' as const;
