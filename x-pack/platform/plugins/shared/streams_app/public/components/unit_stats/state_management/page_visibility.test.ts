/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageVisible$ } from './page_visibility';

let visibilityState: DocumentVisibilityState = 'visible';

const changeVisibility = (next: DocumentVisibilityState) => {
  visibilityState = next;
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeAll(() => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilityState,
  });
});

beforeEach(() => {
  visibilityState = 'visible';
});

describe('pageVisible$', () => {
  it('emits the current state when it is subscribed to', () => {
    visibilityState = 'hidden';
    const emitted: boolean[] = [];

    const subscription = pageVisible$.subscribe((isVisible) => emitted.push(isVisible));
    subscription.unsubscribe();

    expect(emitted).toEqual([false]);
  });

  it('emits each change of visibility', () => {
    const emitted: boolean[] = [];
    const subscription = pageVisible$.subscribe((isVisible) => emitted.push(isVisible));

    changeVisibility('hidden');
    changeVisibility('visible');
    subscription.unsubscribe();

    expect(emitted).toEqual([true, false, true]);
  });

  it('emits nothing for an event that does not change visibility', () => {
    const emitted: boolean[] = [];
    const subscription = pageVisible$.subscribe((isVisible) => emitted.push(isVisible));

    changeVisibility('visible');
    subscription.unsubscribe();

    expect(emitted).toEqual([true]);
  });

  it('stops listening when it is unsubscribed from', () => {
    const emitted: boolean[] = [];
    const subscription = pageVisible$.subscribe((isVisible) => emitted.push(isVisible));
    subscription.unsubscribe();

    changeVisibility('hidden');

    expect(emitted).toEqual([true]);
  });
});
