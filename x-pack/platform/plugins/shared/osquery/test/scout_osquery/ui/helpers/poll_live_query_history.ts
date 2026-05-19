/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

/**
 * Live-query results are rendered by the UI via `apiServices.osquery.liveQueries.create`
 * returning an `action_id`, followed by Kibana aggregating agent-shipped docs into the
 * action's row. On serverless, aggregation can lag the create by enough for the UI to
 * render its "no results yet" state before the row populates.
 *
 * `waitForLiveQueryComplete` polls the action's details endpoint until the first query
 * reports `status: 'completed'` or `docs > 0`, whichever arrives first. Tests invoke it
 * BEFORE calling `pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults()` (or the
 * pack-variant `waitForPackResults()`).
 *
 * Uses `kbnClient` (superuser) rather than the role-scoped session; readiness checks
 * should not be gated on the role under test.
 */

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_POLL_INTERVAL_MS = 3_000;
const MAX_5XX_RETRIES = 3;

interface LiveQueryDetailsResponse {
  data: {
    queries?: Array<{
      status?: string;
      docs?: number;
      successful?: number;
      failed?: number;
    }>;
  };
}

interface KbnRequestError {
  response?: { status?: number };
  message?: string;
}

const statusOf = (err: unknown): number | undefined => {
  const maybe = err as KbnRequestError | undefined;

  return maybe?.response?.status;
};

export interface WaitForLiveQueryCompleteOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  spaceId?: string;
}

/**
 * Polls `GET /api/osquery/live_queries/{actionId}` until the first query completes
 * (or reports at least one doc), or the deadline elapses.
 *
 * Error handling contract:
 *   - 404 / "not found": action not yet visible; keep polling.
 *   - 5xx: retry up to {@link MAX_5XX_RETRIES} times before failing hard.
 *   - 401/403: hard error (role gap, not a timing issue).
 *   - `queries[0].failed > 0`: hard error — the query executed but failed agent-side.
 *
 * @throws when the deadline passes, or on the hard-error conditions above.
 */
export async function waitForLiveQueryComplete(
  kbnClient: KbnClient,
  actionId: string,
  opts: WaitForLiveQueryCompleteOptions = {}
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const basePath = opts.spaceId && opts.spaceId !== 'default' ? `/s/${opts.spaceId}` : '';
  const path = `${basePath}/api/osquery/live_queries/${actionId}`;

  const deadline = Date.now() + timeoutMs;
  let consecutive5xx = 0;

  while (Date.now() < deadline) {
    try {
      const { data } = await kbnClient.request<LiveQueryDetailsResponse>({
        method: 'GET',
        path,
      });

      const query = data?.data?.queries?.[0];
      if (query) {
        if ((query.failed ?? 0) > 0) {
          throw new Error(
            `waitForLiveQueryComplete: actionId=${actionId} reported failed=${query.failed} — agent-side execution failure`
          );
        }

        if (query.status === 'completed' || (query.docs ?? 0) > 0) {
          return;
        }
      }

      consecutive5xx = 0;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('waitForLiveQueryComplete:')) {
        throw err;
      }

      const status = statusOf(err);
      if (status === 401 || status === 403) {
        throw new Error(
          `waitForLiveQueryComplete: ${status} on GET ${path} — role lacks live_queries read`
        );
      }

      if (status === 404) {
        // 404: action row not visible yet — keep polling.
        consecutive5xx = 0;
      } else if (status !== undefined && status >= 500) {
        consecutive5xx += 1;
        if (consecutive5xx > MAX_5XX_RETRIES) {
          throw new Error(
            `waitForLiveQueryComplete: ${consecutive5xx} consecutive 5xx responses polling actionId=${actionId}`
          );
        }
      }
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(
    `waitForLiveQueryComplete: timed out after ${Math.round(
      timeoutMs / 1000
    )}s waiting for actionId=${actionId} to complete`
  );
}
