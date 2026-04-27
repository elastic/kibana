/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
// eslint-disable-next-line no-restricted-imports
import { expect, type Response } from '@playwright/test';

import { LIVE_QUERY_SUBMIT_PRE_CLICK_MS, MONACO_TO_RHF_SETTLE_MS } from './constants';
import { dismissVisibleToasts } from './dismiss_toasts';

/**
 * Why this helper exists
 * ----------------------
 * The live-query `Submit` button is an `EuiButton` whose `onClick` is
 * react-hook-form's `handleSubmit(onSubmit)`. Clicking it from a Playwright test
 * has three failure modes that all look identical to the test runner (nothing
 * happens):
 *
 *   1. The click lands during a re-render in which `EuiButton` swaps its DOM
 *      node or toggles `disabled`, so the event is dropped.
 *   2. `handleSubmit` silently no-ops because RHF validation fails. The most
 *      common trigger is the Monaco editor's 500 ms `useDebounce` (see
 *      `public/editor/index.tsx`): we typed the query, but the debounced
 *      `onChange` hasn't flushed into RHF yet, so `query` is still empty at
 *      validation time.
 *   3. A toast or combo-box popover is obscuring the button and the click is
 *      intercepted.
 *
 * Every "Submit isn't clicked" symptom we've chased has come from one of these.
 * The reliable signal is network: if `POST /api/osquery/live_queries` fires,
 * the form really submitted. If it didn't, retry — by the second attempt the
 * Monaco debounce has definitely flushed and any transient overlays are gone.
 *
 * This helper centralises that strategy so every page object that submits a
 * live-query form behaves the same way.
 *
 * Implementation notes: register `waitForResponse` **before** `click` each attempt (Playwright
 * guidance — avoids missing fast responses). Assert Submit is enabled before clicking; retry
 * after `MONACO_TO_RHF_SETTLE_MS` so debounced Monaco → RHF sync can complete. A fixed
 * `LIVE_QUERY_SUBMIT_PRE_CLICK_MS` pause runs immediately before each Submit click.
 */

const LIVE_QUERY_URL_RE = /\/api\/osquery\/live_queries(\?|$)/;

export interface SubmitLiveQueryOptions {
  /**
   * Total time budget across all retries. Defaults to 60 s to cover slow
   * Kibana + Fleet cold starts in CI.
   */
  timeoutMs?: number;
  /** Per-attempt wait for the outgoing POST. Defaults to 10 s. */
  perAttemptTimeoutMs?: number;
  /** Maximum click retries. Defaults to 3. */
  maxAttempts?: number;
}

export interface SubmitLiveQueryResult {
  response: Response;
  /**
   * The `action_id` returned by `POST /api/osquery/live_queries`. Callers can
   * feed this to `helpers/poll_live_query_history.ts::waitForLiveQueryComplete`
   * to gate subsequent UI assertions on agent-side completion rather than
   * racing the aggregator.
   */
  actionId?: string;
}

/**
 * Click a LiveQuery form's Submit button and assert the network call actually
 * went out. Returns the successful `POST /api/osquery/live_queries` response
 * along with the parsed `action_id` for downstream polling.
 *
 * Throws with a descriptive message if no attempt produced a response within
 * the budget, or if the server rejected the submission.
 */
export async function submitLiveQuery(
  page: ScoutPage,
  submitButton: Locator,
  options: SubmitLiveQueryOptions = {}
): Promise<SubmitLiveQueryResult> {
  const { timeoutMs = 120_000, perAttemptTimeoutMs = 25_000, maxAttempts = 4 } = options;

  // Toasts and combo-box popovers from prior steps (alerts, Fleet) can intercept clicks.
  for (let round = 0; round < 2; round++) {
    await dismissVisibleToasts(page);
  }

  await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
  await submitButton.scrollIntoViewIfNeeded();

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const attemptTimeout = Math.min(perAttemptTimeoutMs, remaining);

    try {
      if (attempt > 1) {
        await dismissVisibleToasts(page);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, MONACO_TO_RHF_SETTLE_MS);
        });
      }

      await submitButton.scrollIntoViewIfNeeded();
      await expect(submitButton).toBeEnabled({
        timeout: Math.min(25_000, attemptTimeout),
      });

      const responsePromise = page.waitForResponse(
        (resp) => LIVE_QUERY_URL_RE.test(resp.url()) && resp.request().method() === 'POST',
        { timeout: attemptTimeout }
      );

      await new Promise<void>((resolve) => {
        setTimeout(resolve, LIVE_QUERY_SUBMIT_PRE_CLICK_MS);
      });

      // `force: true` bypasses hit-target overlays; `expect(enabled)` above catches disabled/loading.
      await submitButton.click({ force: true, timeout: attemptTimeout });
      const response = await responsePromise;

      if (response.status() >= 400) {
        const body = await response.text().catch(() => '<unreadable body>');
        throw new Error(
          `POST /api/osquery/live_queries rejected with ${response.status()}: ${body}`
        );
      }

      // The response shape is `{ data: { action_id, queries: [...] } }`.
      // Parsing failures shouldn't break the click contract — we return
      // `undefined` and let the caller decide whether the id is required.
      let actionId: string | undefined;
      try {
        const parsed = (await response.json()) as { data?: { action_id?: string } };
        actionId = parsed?.data?.action_id;
      } catch {
        actionId = undefined;
      }

      return { response, actionId };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `submitLiveQuery: no successful POST /api/osquery/live_queries after ${maxAttempts} attempts ` +
      `(budget ${timeoutMs}ms). Last error: ${String(lastError)}`
  );
}
