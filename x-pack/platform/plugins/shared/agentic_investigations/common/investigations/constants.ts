/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

/** Base segment; individual resource URLs are nested under this. */
export const INVESTIGATIONS_INTERNAL_URL = AGENTIC_INVESTIGATIONS_INTERNAL_URL as const;
export const INVESTIGATION_BY_ID_URL = `${INVESTIGATIONS_INTERNAL_URL}/{id}` as const;
export const INVESTIGATION_ASSIGNEES_URL = `${INVESTIGATION_BY_ID_URL}/assignees` as const;
export const INVESTIGATION_CLOSE_URL = `${INVESTIGATION_BY_ID_URL}/close` as const;

/**
 * Template id for investigation conversations.
 * Owned by agent_builder_platform; referenced here and in the escalations
 * feature for guard checks. The single canonical definition lives here.
 */
export const INVESTIGATION_TEMPLATE_ID = 'investigation' as const;

/** Pagination bounds for investigation list queries (future use). */
export const MAX_INVESTIGATIONS_PAGE_SIZE = 50;

/**
 * UI capabilities. Scoped to the investigations sub-feature so they cannot
 * be confused with proposal or escalation capabilities.
 */
export const INVESTIGATIONS_UI_CAPABILITY_SHOW = 'showInvestigations' as const;
export const INVESTIGATIONS_UI_CAPABILITY_MANAGE = 'manageInvestigations' as const;
