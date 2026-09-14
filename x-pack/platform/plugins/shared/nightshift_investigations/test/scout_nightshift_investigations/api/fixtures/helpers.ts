/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomInt, randomUUID } from 'crypto';
import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import { COMMON_HEADERS } from './constants';

/**
 * Base path for the shared investigations API exposed by the agenticInvestigations plugin.
 * This is the primary read/write surface for investigation records after SO removal.
 */
const AGENTIC_INVESTIGATIONS_PATH = 'internal/investigations/investigations';

/**
 * Path for nightshift-owned write operations that still exist after SO removal:
 * start, update, ensure, follow, and availability.
 */
const NIGHTSHIFT_PATH = 'internal/nightshift/investigations';

/**
 * The agenticInvestigations plugin exposes versioned routes. All callers must
 * include this header alongside the standard kbn-xsrf header.
 */
const AGENTIC_API_VERSION = '1' as const;

const AGENTIC_HEADERS = {
  ...COMMON_HEADERS,
  'elastic-api-version': AGENTIC_API_VERSION,
} as const;

const spacePath = (path: string, spaceId?: string): string =>
  spaceId ? `s/${spaceId}/${path}` : path;

/** A per-run id so parallel/repeated Scout runs against a shared deployment cannot collide. */
export const uniqueId = (prefix: string): string => `${prefix}-${randomUUID()}`;

const DAY_MS = 24 * 60 * 60 * 1000;
const ORIGIN_START_MS = Date.UTC(1990, 0, 1);
const ORIGIN_SPAN_DAYS = 30 * 365;

export interface SeedTimeWindow {
  /** Builds an ISO timestamp offset from the window's random origin. */
  iso: (offset: { day: number; hour?: number; minute?: number }) => string;
  /** A `created_after`/`created_before` query string spanning the whole window. */
  createdRange: string;
}

/**
 * A per-run time window so list-query isolation doesn't depend on a shared fixed
 * calendar date that other suites or interrupted runs could also seed into.
 */
export const seedTimeWindow = (dayCount = 4): SeedTimeWindow => {
  const originMs = ORIGIN_START_MS + randomInt(ORIGIN_SPAN_DAYS) * DAY_MS;
  const iso = ({ day, hour = 0, minute = 0 }: { day: number; hour?: number; minute?: number }) =>
    new Date(originMs + day * DAY_MS + hour * 3_600_000 + minute * 60_000).toISOString();
  return {
    iso,
    createdRange: `created_after=${iso({ day: 0 })}&created_before=${iso({ day: dayCount })}`,
  };
};

export interface InvestigationRequestOptions {
  spaceId?: string;
}

export interface UpsertInvestigationOptions {
  id: string;
  /** Defaults to 'default'. The server enforces the space from the request context, but the
   * schema requires this field in the body. */
  spaceId?: string;
  /** Defaults to 'observability'. */
  solution?: string;
  /** Defaults to 'alert'. */
  subjectType?: 'significant_event' | 'alert' | 'case' | 'custom';
  /** Defaults to 'test-subject-1'. */
  subjectId?: string;
  subjectSummary?: string;
  /** Defaults to 'running'. */
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  severity?: '80-critical' | '60-high' | '40-medium' | '20-low';
  title?: string;
  summary?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  impactedEntities?: Array<{
    name: string;
    nameText: string;
    type?: string;
    featureId?: string;
    streamName?: string;
  }>;
}

/**
 * Builds the minimal valid body for the agenticInvestigations upsert endpoint.
 * Required fields that are absent in `options` are filled with safe defaults.
 */
const buildInvestigationBody = (options: UpsertInvestigationOptions): Record<string, unknown> => {
  const now = new Date().toISOString();
  const {
    id,
    spaceId = 'default',
    solution = 'observability',
    subjectType = 'alert',
    subjectId = 'test-subject-1',
    subjectSummary,
    status = 'running',
    severity,
    title,
    summary,
    createdAt = now,
    startedAt,
    completedAt,
    impactedEntities = [],
  } = options;

  return {
    id,
    spaceId,
    solution,
    subjectType,
    subjectId,
    ...(subjectSummary !== undefined && { subjectSummary }),
    status,
    ...(severity !== undefined && { severity }),
    ...(title !== undefined && { title }),
    ...(summary !== undefined && { summary }),
    createdAt,
    updatedAt: now,
    ...(startedAt !== undefined && { startedAt }),
    ...(completedAt !== undefined && { completedAt }),
    impactedEntities,
    hypotheses: [],
    recommendations: [],
    blindSpots: [],
  };
};

/**
 * Creates or fully replaces an investigation via the agenticInvestigations upsert route.
 * Use this instead of SO-based seeding: the nightshift-investigation SO type has been removed.
 * The caller must hold the `manage_investigations` API privilege
 * (granted by `agenticInvestigations: ['all']`).
 */
export const upsertInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  options: UpsertInvestigationOptions,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.post(spacePath(AGENTIC_INVESTIGATIONS_PATH, spaceId), {
    headers: { ...AGENTIC_HEADERS, ...cookieHeader },
    body: buildInvestigationBody({ ...options, spaceId: spaceId ?? options.spaceId }),
    responseType: 'json',
  });

/**
 * Retrieves a single investigation by id from the agenticInvestigations GET route.
 * Requires the `read_investigations` API privilege (`agenticInvestigations: ['read']` or higher).
 */
export const getInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.get(spacePath(`${AGENTIC_INVESTIGATIONS_PATH}/${id}`, spaceId), {
    headers: { ...AGENTIC_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

/**
 * Lists investigations from the agenticInvestigations list route.
 * Requires the `read_investigations` API privilege (`agenticInvestigations: ['read']` or higher).
 *
 * Supported query params: `status`, `severity`, `impactedEntityName`, `from`, `size`, `sortOrder`.
 */
export const listInvestigations = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  { query = '', spaceId }: InvestigationRequestOptions & { query?: string } = {}
): Promise<ApiClientResponse> =>
  apiClient.get(
    spacePath(
      query ? `${AGENTIC_INVESTIGATIONS_PATH}?${query}` : AGENTIC_INVESTIGATIONS_PATH,
      spaceId
    ),
    {
      headers: { ...AGENTIC_HEADERS, ...cookieHeader },
      responseType: 'json',
    }
  );

/**
 * Updates an investigation's outcome fields via the nightshift PATCH route.
 * Requires `agentBuilder:write` (granted by `agentBuilder: ['all']`).
 */
export const updateInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  body: Record<string, unknown>,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.patch(spacePath(`${NIGHTSHIFT_PATH}/${id}`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

/**
 * Calls the nightshift `_ensure` route to verify a running investigation is still live.
 * Requires `agentBuilder:write`.
 */
export const ensureInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.post(spacePath(`${NIGHTSHIFT_PATH}/${id}/_ensure`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });
