/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

export const INVESTIGATION_BY_ID_URL = `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/{id}` as const;
export const INVESTIGATION_ASSIGNEES_URL = `${INVESTIGATION_BY_ID_URL}/assignees` as const;

/**
 * Template id for investigation conversations.
 * Owned by agent_builder_platform; referenced here and in the escalations
 * feature for guard checks. The single canonical definition lives here.
 */
export const INVESTIGATION_TEMPLATE_ID = 'investigation' as const;

/**
 * Maximum number of assignees per investigation. Matches the escalation
 * collaborator ceiling so an investigation and its escalation can mirror
 * assignees one-for-one without hitting a separate limit.
 */
export const MAX_INVESTIGATION_ASSIGNEES = 100;

/** UI capabilities. */
export const INVESTIGATIONS_UI_CAPABILITY_SHOW = 'showInvestigations' as const;
export const INVESTIGATIONS_UI_CAPABILITY_MANAGE = 'manageInvestigations' as const;
