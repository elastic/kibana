/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForRenderComplete } from './wait_for_render_complete';

const makeContainer = (children: Array<Record<string, string>>): HTMLElement => {
  const container = document.createElement('div');
  for (const attributes of children) {
    const child = document.createElement('div');
    for (const [name, value] of Object.entries(attributes)) {
      child.setAttribute(name, value);
    }
    container.appendChild(child);
  }
  return container;
};

const fastOptions = { timeoutMs: 200, pollIntervalMs: 10, settleMs: 0 };

describe('waitForRenderComplete', () => {
  it('resolves once all expected panels report render completion', async () => {
    const container = makeContainer([
      { 'data-render-complete': 'true' },
      { 'data-render-complete': 'true' },
    ]);

    const result = await waitForRenderComplete({ container, expectedPanels: 2, ...fastOptions });

    expect(result).toEqual({ timedOut: false, renderedPanels: 2, expectedPanels: 2 });
  });

  it('waits for panels that are still loading', async () => {
    const container = makeContainer([
      { 'data-render-complete': 'true' },
      { id: 'pending', 'data-render-complete': 'false' },
    ]);
    setTimeout(() => {
      container.querySelector('#pending')!.setAttribute('data-render-complete', 'true');
    }, 30);

    const result = await waitForRenderComplete({ container, expectedPanels: 2, ...fastOptions });

    expect(result).toEqual({ timedOut: false, renderedPanels: 2, expectedPanels: 2 });
  });

  it('keeps waiting while a data-loading marker is present', async () => {
    const container = makeContainer([{ 'data-render-complete': 'true', 'data-loading': 'true' }]);
    setTimeout(() => {
      container.querySelector('[data-loading]')!.removeAttribute('data-loading');
    }, 30);

    const result = await waitForRenderComplete({ container, expectedPanels: 1, ...fastOptions });

    expect(result.timedOut).toBe(false);
  });

  it('times out and reports how many panels rendered', async () => {
    const container = makeContainer([
      { 'data-render-complete': 'true' },
      { 'data-render-complete': 'false' },
    ]);

    const result = await waitForRenderComplete({ container, expectedPanels: 2, ...fastOptions });

    expect(result).toEqual({ timedOut: true, renderedPanels: 1, expectedPanels: 2 });
  });
});
