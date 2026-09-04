/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomInt, randomUUID } from 'crypto';
import type { ApiClientFixture, ApiClientResponse, KbnClient } from '@kbn/scout';
import { COMMON_HEADERS } from './constants';

const SO_TYPE = 'nightshift-investigation';

const INVESTIGATIONS_PATH = 'internal/nightshift/investigations';

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

export const getInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.get(spacePath(`${INVESTIGATIONS_PATH}/${id}`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export const listInvestigations = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  { query = '', spaceId }: InvestigationRequestOptions & { query?: string } = {}
): Promise<ApiClientResponse> =>
  apiClient.get(
    spacePath(query ? `${INVESTIGATIONS_PATH}?${query}` : INVESTIGATIONS_PATH, spaceId),
    {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    }
  );

export const updateInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  body: Record<string, unknown>,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.patch(spacePath(`${INVESTIGATIONS_PATH}/${id}`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

export const ensureInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.post(spacePath(`${INVESTIGATIONS_PATH}/${id}/_ensure`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export interface SeedInvestigationOptions {
  id: string;
  space?: string;
  status?: string;
  subject_type?: string;
  subject_id?: string;
  trigger_type?: string;
  concurrency_key?: string;
  executed_by?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  summary?: string;
  conclusion?: string;
  conversation_id?: string;
  subject_summary?: string;
  impact?: { entities: Array<Record<string, unknown>> };
}

export const seedInvestigation = async (
  kbnClient: KbnClient,
  options: SeedInvestigationOptions
): Promise<void> => {
  const {
    id,
    space,
    status = 'running',
    subject_type = 'alert',
    subject_id = 'test-alert-1',
    trigger_type = 'manual',
    created_at = new Date().toISOString(),
    ...rest
  } = options;

  await kbnClient.savedObjects.create({
    type: SO_TYPE,
    id,
    overwrite: true,
    space,
    attributes: {
      status,
      subject_type,
      subject_id,
      trigger_type,
      created_at,
      ...rest,
    },
  });
};

const hasHttpStatus = (error: unknown): error is { status?: number } =>
  typeof error === 'object' && error !== null && 'status' in error;

export const deleteInvestigation = async (
  kbnClient: KbnClient,
  id: string,
  space?: string
): Promise<void> => {
  try {
    await kbnClient.savedObjects.delete({ type: SO_TYPE, id, space });
  } catch (error) {
    if (hasHttpStatus(error) && error.status === 404) {
      return;
    }
    throw error;
  }
};
