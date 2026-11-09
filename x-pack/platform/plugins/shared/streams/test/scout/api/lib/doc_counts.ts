/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { COMMON_API_HEADERS } from '../fixtures/constants';

export interface StreamDocCount {
  stream: string;
  count: number;
}

// On serverless, counts come from the metering stats API, which refreshes every ~30s.
export const METERING_REFRESH_TIMEOUT_MS = 45_000;

export const lastHourRange = () => {
  const now = Date.now();
  return { start: now - 3_600_000, end: now + 60_000 };
};

export const getDocCounts = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  kind: 'total' | 'ingestion' | 'degraded' | 'failed',
  query: Record<string, string | number> = {}
) => {
  const search = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)])
  ).toString();
  return apiClient.get(`internal/streams/doc_counts/${kind}${search ? `?${search}` : ''}`, {
    headers: { ...COMMON_API_HEADERS, ...cookieHeader },
    responseType: 'json',
  });
};

export const postDocCounts = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  kind: 'total' | 'ingestion' | 'degraded' | 'failed',
  body: { streams: string[]; start?: number; end?: number }
) =>
  apiClient.post(`internal/streams/doc_counts/${kind}`, {
    headers: { ...COMMON_API_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

export const findCount = (body: StreamDocCount[], stream: string) =>
  body.find((entry) => entry.stream === stream)?.count;

const toStreamCounts = (
  { statusCode, body }: { statusCode: number; body: unknown },
  streams: string[]
) => {
  const counts = statusCode === 200 ? (body as StreamDocCount[]) : [];
  return {
    statusCode,
    counts: Object.fromEntries(streams.map((stream) => [stream, findCount(counts, stream)])),
  };
};

// Shaped for `expect.poll`: status and per-stream counts in one comparable value.
export const getStreamCounts = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  kind: 'total' | 'ingestion' | 'degraded' | 'failed',
  query: Record<string, string | number>,
  streams: string[]
) => toStreamCounts(await getDocCounts(apiClient, cookieHeader, kind, query), streams);

/** Like {@link getStreamCounts}, for the POST variant that takes the stream names in the body. */
export const postStreamCounts = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  kind: 'total' | 'ingestion' | 'degraded' | 'failed',
  body: { streams: string[]; start?: number; end?: number },
  streams: string[]
) => toStreamCounts(await postDocCounts(apiClient, cookieHeader, kind, body), streams);
