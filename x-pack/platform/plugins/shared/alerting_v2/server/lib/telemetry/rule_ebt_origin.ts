/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import {
  ruleEventAppTelemetrySchema,
  type RuleEbtChannel,
  type RuleEbtOrigin,
} from '@kbn/alerting-v2-schemas';

/** Options an in-process caller passes when it asks for a rules client. */
export interface CreateRulesClientOptions {
  /**
   * The app making changes through this client, carried on every rule event.
   * Takes precedence over the app derived from the request.
   */
  app?: string;
}

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

  const parsed = ruleEventAppTelemetrySchema.safeParse(app);
  return parsed.success ? parsed.data : undefined;
};

const getChannel = (request: KibanaRequest): RuleEbtChannel => {
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
 * Resolves where a rule change came from: the channel is derived from the request, and
 * the app is the one configured by the calling plugin or, for UI requests, the one named in
 * the execution context. The app is omitted when it fails {@link ruleEventAppTelemetrySchema}, and
 * undefined in every other case.
 */
export const resolveRuleTelemetryEventOrigin = (
  request: KibanaRequest,
  options?: CreateRulesClientOptions
): RuleEbtOrigin => {
  const channel = getChannel(request);
  const app =
    toBoundedApp(options?.app) ||
    (channel === 'ui' ? getAppFromExecutionContext(request) : undefined);

  return { channel, ...(app ? { app } : {}) };
};
