/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { CustomAppsNavLinks, toDeepLinks } from './nav_links';

describe('toDeepLinks', () => {
  it('includes only the apps flagged for the navigation', () => {
    expect(
      toDeepLinks([
        { id: 'a', title: 'Shown', showInNav: true },
        { id: 'b', title: 'Hidden' },
        { id: 'c', title: 'Also hidden', showInNav: false },
      ])
    ).toEqual([expect.objectContaining({ id: 'a', title: 'Shown', path: '/app/a' })]);
  });

  it('makes links visible in both navigation styles and global search', () => {
    const [link] = toDeepLinks([{ id: 'a', title: 'Shown', showInNav: true }]);
    expect(link.visibleIn).toEqual(['classicSideNav', 'projectSideNav', 'globalSearch']);
  });
});

describe('CustomAppsNavLinks', () => {
  const httpWith = (items: unknown) =>
    ({ get: jest.fn().mockResolvedValue({ items }) } as unknown as HttpStart);

  it('pushes an updater that sets the deep links', async () => {
    const navLinks = new CustomAppsNavLinks();
    await navLinks.refresh(httpWith([{ id: 'a', title: 'Shown', showInNav: true }]));

    const updated = navLinks.updater$.getValue()({} as never);
    expect(updated?.deepLinks).toEqual([expect.objectContaining({ id: 'a' })]);
  });

  it('keeps the previous links when the request fails', async () => {
    const navLinks = new CustomAppsNavLinks();
    await navLinks.refresh(httpWith([{ id: 'a', title: 'Shown', showInNav: true }]));

    const failing = { get: jest.fn().mockRejectedValue(new Error('nope')) } as unknown as HttpStart;
    await navLinks.refresh(failing);

    // A failed refresh should not blank the navigation the user can already see.
    const updated = navLinks.updater$.getValue()({} as never);
    expect(updated?.deepLinks).toEqual([expect.objectContaining({ id: 'a' })]);
  });
});
