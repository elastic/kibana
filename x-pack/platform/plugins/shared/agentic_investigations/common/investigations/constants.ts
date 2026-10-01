/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

export const INVESTIGATIONS_INTERNAL_URL =
  `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/investigations` as const;

/** URL for the per-investigation assignment route. */
export const INVESTIGATION_ASSIGN_URL = `${INVESTIGATIONS_INTERNAL_URL}/{id}/assignees` as const;

export const INVESTIGATIONS_UI_CAPABILITY_SHOW = 'showInvestigations' as const;
export const INVESTIGATIONS_UI_CAPABILITY_MANAGE = 'manageInvestigations' as const;

export const INVESTIGATION_STATUS_URL = `${INVESTIGATIONS_INTERNAL_URL}/{id}/status` as const;
export const INVESTIGATION_CLOSE_PREVIEW_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/{id}/_close_preview` as const;

/** The caller's investigation and escalation API privileges, so a UI can enable write actions without UI capabilities. */
export const INVESTIGATIONS_PRIVILEGES_URL =
  `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/_privileges` as const;
/** Read one investigation: conversation, metadata, side-index entities, and in-progress state. */
export const INVESTIGATION_BY_ID_URL = `${INVESTIGATIONS_INTERNAL_URL}/{id}` as const;

/** Counts of the filtered investigations per severity. Registered before `{id}`. */
export const INVESTIGATIONS_SEVERITY_COUNTS_URL =
  `${INVESTIGATIONS_INTERNAL_URL}/_severity_counts` as const;

export const INVESTIGATION_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

/** `metadata.status` values. A missing status reads as open. */
export const INVESTIGATION_METADATA_STATUSES = ['open', 'closed'] as const;

export const INVESTIGATIONS_SORT_FIELDS = ['created_at', 'updated_at', 'severity'] as const;

export const MAX_INVESTIGATIONS_PAGE_SIZE = 100;

export const DEFAULT_INVESTIGATIONS_PAGE_SIZE = 20;

/**
 * Ceiling on investigations a list or count considers. Filters that Agent Builder cannot apply
 * (in progress, subject, entity, free text on summary and verdict, severity sort) run in memory
 * over at most this many candidates, so pages beyond it are not reachable.
 */
export const MAX_INVESTIGATION_CANDIDATES = 1000;

/** Bound on the values one multi-valued list filter carries. */
export const MAX_INVESTIGATION_FILTER_VALUES = 20;

/** Builtin agent tool that reads an investigation. */
export const GET_INVESTIGATION_TOOL_ID = 'investigations.get' as const;
