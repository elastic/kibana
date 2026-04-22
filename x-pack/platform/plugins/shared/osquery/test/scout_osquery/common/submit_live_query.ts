/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
// eslint-disable-next-line no-restricted-imports
import type { Response } from 'playwright/test';

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

/**
 * Click a LiveQuery form's Submit button and assert the network call actually
 * went out. Returns the successful `POST /api/osquery/live_queries` response.
 *
 * Throws with a descriptive message if no attempt produced a response within
 * the budget, or if the server rejected the submission.
 */
export async function submitLiveQuery(
  page: ScoutPage,
  submitButton: Locator,
  options: SubmitLiveQueryOptions = {}
): Promise<Response> {
  const { timeoutMs = 60_000, perAttemptTimeoutMs = 10_000, maxAttempts = 3 } = options;

  await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
  await submitButton.scrollIntoViewIfNeeded();

  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const attemptTimeout = Math.min(perAttemptTimeoutMs, remaining);

    try {
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) => LIVE_QUERY_URL_RE.test(resp.url()) && resp.request().method() === 'POST',
          { timeout: attemptTimeout }
        ),
        // `force: true` bypasses Playwright's actionability check (covered
        // elsewhere overlay, stale hit-test). The network-assertion above is
        // what confirms the click actually reached RHF's handleSubmit.
        submitButton.click({ force: true }),
      ]);

      if (response.status() >= 400) {
        const body = await response.text().catch(() => '<unreadable body>');
        throw new Error(
          `POST /api/osquery/live_queries rejected with ${response.status()}: ${body}`
        );
      }

      return response;
    } catch (error) {
      lastError = error;
      // Before retrying, give the Monaco 500 ms debounce a chance to flush and
      // any in-flight validation / re-render to settle.
      await page.waitForTimeout(750);
    }
  }

  throw new Error(
    `submitLiveQuery: no successful POST /api/osquery/live_queries after ${maxAttempts} attempts ` +
      `(budget ${timeoutMs}ms). Last error: ${String(lastError)}`
  );
}
