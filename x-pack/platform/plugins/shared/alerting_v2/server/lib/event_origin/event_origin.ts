/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import {
  eventOriginAppSchema,
  type EventOrigin,
  type EventOriginActor,
  type EventOriginChannel,
  type RequestEventOrigin,
} from './origin_schemas';

/**
 * Headers Core's `core.http.fetch` attaches to every request the Kibana browser app makes.
 * Core only exports a constant for `x-elastic-internal-origin`; `kbn-version` is private to
 * the http server and `referer` is a standard header the browser adds itself.
 */
const UI_REQUEST_HEADERS = ['kbn-version', 'referer', X_ELASTIC_INTERNAL_ORIGIN_REQUEST] as const;

/** Header Core's browser execution context service sets on every `core.http.fetch` call. */
const EXECUTION_CONTEXT_HEADER = 'x-kbn-context';

const toBoundedApp = (app: string | undefined): string | undefined => {
  if (app === undefined) {
    return undefined;
  }

  const parsed = eventOriginAppSchema.safeParse(app);
  return parsed.success ? parsed.data : undefined;
};

const getChannel = (request: KibanaRequest): EventOriginChannel => {
  if (request.isFakeRequest) {
    return 'system';
  }

  const isUiRequest = UI_REQUEST_HEADERS.every((header) => Boolean(request.headers[header]));
  return isUiRequest ? 'ui' : 'api';
};

/** Reads the app from the `name` of the execution context Core serialises into the request headers. */
const getAppFromExecutionContext = (request: KibanaRequest): string | undefined => {
  const header = request.headers[EXECUTION_CONTEXT_HEADER];
  const rawContext = Array.isArray(header) ? header[0] : header;
  if (!rawContext) {
    return undefined;
  }

  try {
    const { name } = JSON.parse(decodeURIComponent(rawContext)) as { name?: unknown };
    return typeof name === 'string' ? toBoundedApp(name) : undefined;
  } catch (err) {
    return undefined;
  }
};

/**
 * Resolves the request-derived part of an event origin: the channel comes from the
 * request, and the app is the one configured by the caller or, for UI requests, the
 * one named in the execution context. The app is omitted when it fails
 * {@link eventOriginAppSchema}, and is undefined in every other case.
 */
export const resolveRequestEventOrigin = (
  request: KibanaRequest,
  options?: { app?: string }
): RequestEventOrigin => {
  const channel = getChannel(request);
  const app =
    toBoundedApp(options?.app) ||
    (channel === 'ui' ? getAppFromExecutionContext(request) : undefined);

  return { channel, ...(app ? { app } : {}) };
};

/** Publisher-context origin: the injected actor plus the request-derived channel and app. */
export const toEventOrigin = (
  actor: EventOriginActor,
  request: KibanaRequest,
  options?: { app?: string }
): EventOrigin => {
  const { channel, app } = resolveRequestEventOrigin(request, options);
  return { actor, channel, ...(app ? { app } : {}) };
};
