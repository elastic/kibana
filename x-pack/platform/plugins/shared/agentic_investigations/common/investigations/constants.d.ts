/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare const INVESTIGATIONS_INTERNAL_URL: '/internal/investigations/investigations';
/** URL for the per-investigation assignment route. */
export declare const INVESTIGATION_ASSIGN_URL: '/internal/investigations/investigations/{id}/assignees';
export declare const INVESTIGATIONS_UI_CAPABILITY_SHOW: 'showInvestigations';
export declare const INVESTIGATIONS_UI_CAPABILITY_MANAGE: 'manageInvestigations';
export declare const INVESTIGATION_STATUS_URL: '/internal/investigations/investigations/{id}/status';
export declare const INVESTIGATION_CLOSE_PREVIEW_URL: '/internal/investigations/investigations/{id}/_close_preview';
/** The caller's investigation and escalation API privileges, so a UI can enable write actions without UI capabilities. */
export declare const INVESTIGATIONS_PRIVILEGES_URL: '/internal/investigations/_privileges';
/** Read one investigation: conversation, metadata, side-index entities, and in-progress state. */
export declare const INVESTIGATION_BY_ID_URL: '/internal/investigations/investigations/{id}';
/** Counts of the filtered investigations per severity. Registered before `{id}`. */
export declare const INVESTIGATIONS_SEVERITY_COUNTS_URL: '/internal/investigations/investigations/_severity_counts';
export declare const INVESTIGATION_SEVERITIES: readonly ['low', 'medium', 'high', 'critical'];
/** Severity filter value for investigations whose severity has not been set. */
export declare const INVESTIGATION_SEVERITY_NONE: 'none';
/** `metadata.status` values. A missing status reads as open. */
export declare const INVESTIGATION_METADATA_STATUSES: readonly ['open', 'closed'];
export declare const INVESTIGATIONS_SORT_FIELDS: readonly ['created_at', 'updated_at', 'severity'];
export declare const MAX_INVESTIGATIONS_PAGE_SIZE = 100;
export declare const DEFAULT_INVESTIGATIONS_PAGE_SIZE = 20;
/**
 * Ceiling on investigations a list or count considers. Filters that Agent Builder cannot apply
 * (in progress, subject, entity, free text on summary and verdict, severity sort) run in memory
 * over at most this many candidates, so pages beyond it are not reachable.
 */
export declare const MAX_INVESTIGATION_CANDIDATES = 1000;
/** Bound on the values one multi-valued list filter carries. */
export declare const MAX_INVESTIGATION_FILTER_VALUES = 20;
/** Bound on the investigation ids one list call reads, so one call can hydrate a page of cards. */
export declare const MAX_INVESTIGATION_ID_FILTER_VALUES = 100;
/** Builtin agent tool that reads an investigation. */
export declare const GET_INVESTIGATION_TOOL_ID: 'agentic_investigations.get';
