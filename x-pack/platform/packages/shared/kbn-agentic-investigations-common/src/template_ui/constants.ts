/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Agent Builder tab ids are a global keyspace, so these are prefixed with the package name
 * rather than a solution name: the tabs are registered once and shared by every solution that
 * registers an agentic investigation template.
 */
export const AGENTIC_INVESTIGATIONS_OVERVIEW_TAB_ID = 'agenticInvestigations.overview';
export const AGENTIC_INVESTIGATIONS_ATTACHMENTS_TAB_ID = 'agenticInvestigations.attachments';
/**
 * Deliberately not Agent Builder's built-in `timeline` id: that one is owned by
 * `agent_builder_platform` and renders chat execution events, not investigation timeline events.
 */
export const AGENTIC_INVESTIGATIONS_TIMELINE_TAB_ID = 'agenticInvestigations.timeline';

export const AGENTIC_INVESTIGATIONS_DEFAULT_TAB_IDS: readonly string[] = [
  AGENTIC_INVESTIGATIONS_OVERVIEW_TAB_ID,
  AGENTIC_INVESTIGATIONS_ATTACHMENTS_TAB_ID,
  AGENTIC_INVESTIGATIONS_TIMELINE_TAB_ID,
];
