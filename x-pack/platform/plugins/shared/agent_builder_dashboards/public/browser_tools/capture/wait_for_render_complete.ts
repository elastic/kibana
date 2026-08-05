/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RenderWaitResult {
  timedOut: boolean;
  renderedPanels: number;
  expectedPanels: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits until every panel inside the container reports render completion, using the same
 * DOM markers reporting and functional tests rely on: presentation panels set
 * `data-render-complete="true"` once loaded and `data-loading` / `data-render-complete="false"`
 * while pending.
 */
export const waitForRenderComplete = async ({
  container,
  expectedPanels,
  timeoutMs,
  pollIntervalMs = 500,
  settleMs = 500,
}: {
  container: HTMLElement;
  expectedPanels: number;
  timeoutMs: number;
  pollIntervalMs?: number;
  settleMs?: number;
}): Promise<RenderWaitResult> => {
  const countRendered = () => container.querySelectorAll('[data-render-complete="true"]').length;
  const countPending = () =>
    container.querySelectorAll('[data-render-complete="false"], [data-loading]').length;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (countRendered() >= expectedPanels && countPending() === 0) {
      // Give charts a moment to finish paint/animation after reporting completion.
      await sleep(settleMs);
      return { timedOut: false, renderedPanels: countRendered(), expectedPanels };
    }
    await sleep(pollIntervalMs);
  }

  return { timedOut: true, renderedPanels: countRendered(), expectedPanels };
};
