/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
// eslint-disable-next-line no-restricted-imports
import { expect, type Response } from '@playwright/test';

import { LIVE_QUERY_SUBMIT_PRE_CLICK_MS } from './constants';
import { dismissVisibleToasts } from './dismiss_toasts';

/**
 * Live-query Submit is `handleSubmit(onSubmit)` on an `EuiButton`. We dismiss toasts, assert the
 * button is enabled, wait `LIVE_QUERY_SUBMIT_PRE_CLICK_MS`, register `waitForResponse` before
 * `click`, then assert `POST /api/osquery/live_queries` completed.
 */

const LIVE_QUERY_URL_RE = /\/api\/osquery\/live_queries(\?|$)/;

export interface SubmitLiveQueryOptions {
  /** Max time to wait for the POST response after the click. Defaults to 120s. */
  responseTimeoutMs?: number;
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
 * Throws if the POST does not complete in time or the server rejects the submission.
 */
export async function submitLiveQuery(
  page: ScoutPage,
  submitButton: Locator,
  options: SubmitLiveQueryOptions = {}
): Promise<SubmitLiveQueryResult> {
  const { responseTimeoutMs = 120_000 } = options;

  for (let round = 0; round < 2; round++) {
    await dismissVisibleToasts(page);
  }

  await submitButton.waitFor({ state: 'visible', timeout: 30_000 });
  await submitButton.scrollIntoViewIfNeeded();
  await expect(submitButton).toBeEnabled({
    timeout: Math.min(25_000, responseTimeoutMs),
  });

  const responsePromise = page.waitForResponse(
    (resp) => LIVE_QUERY_URL_RE.test(resp.url()) && resp.request().method() === 'POST',
    { timeout: responseTimeoutMs }
  );

  await new Promise<void>((resolve) => {
    setTimeout(resolve, LIVE_QUERY_SUBMIT_PRE_CLICK_MS);
  });

  await submitButton.click({ force: true, timeout: responseTimeoutMs });
  const response = await responsePromise;

  if (response.status() >= 400) {
    const body = await response.text().catch(() => '<unreadable body>');
    throw new Error(`POST /api/osquery/live_queries rejected with ${response.status()}: ${body}`);
  }

  let actionId: string | undefined;
  try {
    const parsed = (await response.json()) as { data?: { action_id?: string } };
    actionId = parsed?.data?.action_id;
  } catch {
    actionId = undefined;
  }

  return { response, actionId };
}
