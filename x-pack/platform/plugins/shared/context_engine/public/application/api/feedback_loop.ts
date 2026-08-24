/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  IMPROVEMENTS_INTERNAL_API_VERSION,
  aiIndexFeedbackContextPath,
  aiIndexFeedbackRunPath,
  aiIndexFeedbackSchedulePath,
} from '../../../common/constants';
import type {
  GetFeedbackContextResponse,
  GetFeedbackScheduleResponse,
  PutFeedbackScheduleResponse,
  RunFeedbackLoopResponse,
} from '../../../common/http_api/feedback_loop';

interface AiIndexArgs {
  aiIndexId: string;
  signal?: AbortSignal;
}

/**
 * Fetches everything the feedback agent is given about an AI index, including the rendered task
 * briefing. Used by the interactive hand-off so it says exactly what a scheduled run says.
 */
export const getFeedbackContext = (
  http: HttpStart,
  { aiIndexId, signal }: AiIndexArgs
): Promise<GetFeedbackContextResponse> =>
  http.get<GetFeedbackContextResponse>(buildPath(aiIndexFeedbackContextPath, { aiIndexId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });

/** Starts one analysis run now, without opening chat. */
export const runFeedbackLoop = (
  http: HttpStart,
  { aiIndexId }: { aiIndexId: string }
): Promise<RunFeedbackLoopResponse> =>
  http.post<RunFeedbackLoopResponse>(buildPath(aiIndexFeedbackRunPath, { aiIndexId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
  });

export const getFeedbackSchedule = (
  http: HttpStart,
  { aiIndexId, signal }: AiIndexArgs
): Promise<GetFeedbackScheduleResponse> =>
  http.get<GetFeedbackScheduleResponse>(buildPath(aiIndexFeedbackSchedulePath, { aiIndexId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });

/** Turns the recurring analysis on or off. Scheduled runs execute with the caller's privileges. */
export const putFeedbackSchedule = (
  http: HttpStart,
  { aiIndexId, enabled }: { aiIndexId: string; enabled: boolean }
): Promise<PutFeedbackScheduleResponse> =>
  http.put<PutFeedbackScheduleResponse>(buildPath(aiIndexFeedbackSchedulePath, { aiIndexId }), {
    version: IMPROVEMENTS_INTERNAL_API_VERSION,
    body: JSON.stringify({ enabled }),
  });
