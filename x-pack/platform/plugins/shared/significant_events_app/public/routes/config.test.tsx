/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantEventsAppRouter } from './config';

jest.mock('../pages/settings/page', () => ({
  SettingsPage: () => null,
}));

jest.mock('../pages/significant_events/page', () => ({
  SignificantEventsPage: () => null,
}));

describe('significantEventsAppRouter', () => {
  it('matches /settings to the dedicated route', () => {
    const paths = significantEventsAppRouter
      .getRoutesToMatch('/settings')
      .map((route) => significantEventsAppRouter.getRoutePath(route));

    expect(paths.at(-1)).toBe('/settings');
  });
});
