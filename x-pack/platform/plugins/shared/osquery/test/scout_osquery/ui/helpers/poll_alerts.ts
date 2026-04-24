/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

/**
 * Serverless security projects show meaningfully higher task-manager latency between
 * detection-rule creation and the first alert landing in `.alerts-security.alerts-*`.
 * `openRuleAlertsView()` / `openSeededAlertFlyout()` assume the alerts view (or redirect)
 * will populate within their inline wait,
 * but under UIAM/task-manager lag the view renders with zero rows and the follow-on
 * assertions race a still-empty index.
 *
 * `waitForAtLeastOneAlert` isolates the "did the backend do the thing yet" portion of
 * the wait budget from the UI render portion. Tests call this helper BEFORE navigating
 * to the alerts view, letting the UI wait stay short.
 *
 * Uses `kbnClient` (superuser) rather than the test's role-scoped browser session —
 * readiness checks should not be gated on the role under test.
 */

const DEFAULT_TIMEOUT_MS = 240_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const MAX_5XX_RETRIES = 3;

interface SearchResponse {
  hits: { total: { value: number } | number };
}

interface KbnRequestError {
  response?: { status?: number };
  message?: string;
}

const statusOf = (err: unknown): number | undefined => {
  const maybe = err as KbnRequestError | undefined;

  return maybe?.response?.status;
};

export interface WaitForAtLeastOneAlertOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  spaceId?: string;
}

/**
 * Polls the security alerts index filtered by the rule's UUID until at least one alert
 * has been indexed, or the deadline passes. 404 / index_not_found is treated as
 * "not ready yet — keep polling"; 5xx is retried with short backoff; 401/403 is thrown
 * immediately (role gap is not a timing issue).
 *
 * @throws Error when the deadline elapses with zero alerts, or when a 401/403 surfaces,
 * or when retries exhaust after 5xx responses.
 */
export async function waitForAtLeastOneAlert(
  kbnClient: KbnClient,
  ruleId: string,
  opts: WaitForAtLeastOneAlertOptions = {}
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const basePath = opts.spaceId && opts.spaceId !== 'default' ? `/s/${opts.spaceId}` : '';

  const deadline = Date.now() + timeoutMs;
  let consecutive5xx = 0;

  while (Date.now() < deadline) {
    try {
      const { data } = await kbnClient.request<SearchResponse>({
        method: 'POST',
        path: `${basePath}/internal/search/es`,
        body: {
          params: {
            index: '.alerts-security.alerts-*',
            body: {
              size: 0,
              track_total_hits: true,
              query: { term: { 'kibana.alert.rule.uuid': ruleId } },
            },
          },
        },
      });

      const total = data?.hits?.total;
      const count = typeof total === 'number' ? total : total?.value ?? 0;
      if (count >= 1) return;
      consecutive5xx = 0;
    } catch (err) {
      const status = statusOf(err);
      if (status === 401 || status === 403) {
        throw new Error(
          `waitForAtLeastOneAlert: ${status} on POST /internal/search — role lacks .alerts-security.alerts-* read`
        );
      }

      if (status === 404) {
        // 404: index not ready — poll again.
        consecutive5xx = 0;
      } else if (status !== undefined && status >= 500) {
        consecutive5xx += 1;
        if (consecutive5xx > MAX_5XX_RETRIES) {
          throw new Error(
            `waitForAtLeastOneAlert: ${consecutive5xx} consecutive 5xx responses polling alerts for ruleId=${ruleId}`
          );
        }
      }
      // Other errors: backoff via poll interval.
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(
    `waitForAtLeastOneAlert: timed out after ${Math.round(
      timeoutMs / 1000
    )}s waiting for at least one alert on ruleId=${ruleId}`
  );
}
