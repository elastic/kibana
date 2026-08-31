/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import { COMMON_HEADERS } from './constants';

const SO_TYPE = 'nightshift-investigation';

const INVESTIGATIONS_PATH = 'internal/nightshift/investigations';

const spacePath = (path: string, spaceId?: string): string =>
  spaceId ? `s/${spaceId}/${path}` : path;

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

export const waitForInvestigation = async (kbnClient: KbnClient, id: string): Promise<void> => {
  const maxAttempts = 10;
  const delayMs = 500;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await kbnClient.savedObjects.get({ type: SO_TYPE, id });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`Investigation record "${id}" did not appear within ${maxAttempts} attempts`);
};

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
      investigation_id: id,
      status,
      subject_type,
      subject_id,
      trigger_type,
      created_at,
      ...rest,
    },
  });
};

export const deleteInvestigation = async (
  kbnClient: KbnClient,
  id: string,
  space?: string
): Promise<void> => {
  try {
    await kbnClient.savedObjects.delete({ type: SO_TYPE, id, space });
  } catch {
    // ignore 404s during cleanup
  }
};
