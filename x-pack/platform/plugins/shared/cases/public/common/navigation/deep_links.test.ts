/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCasesDeepLinks } from './deep_links';

describe('getCasesDeepLinks', () => {
  it('it returns the deep links', () => {
    const deepLinks = getCasesDeepLinks({});
    expect(deepLinks).toEqual({
      id: 'cases',
      path: '/cases',
      title: 'Cases',
      deepLinks: [
        {
          id: 'cases_create',
          path: '/cases/create',
          title: 'Create',
        },
        {
          id: 'cases_configure',
          path: '/cases/configure',
          title: 'Settings',
        },
      ],
    });
  });

  it('it returns the deep links with a different base bath', () => {
    const deepLinks = getCasesDeepLinks({ basePath: '/test' });
    expect(deepLinks).toEqual({
      id: 'cases',
      path: '/test',
      title: 'Cases',
      deepLinks: [
        {
          id: 'cases_create',
          path: '/test/create',
          title: 'Create',
        },
        {
          id: 'cases_configure',
          path: '/test/configure',
          title: 'Settings',
        },
      ],
    });
  });

  it('it extends the deep links correctly', () => {
    const deepLinks = getCasesDeepLinks({
      extend: {
        cases: {
          visibleIn: [],
        },
        cases_create: {
          visibleIn: [],
        },
        cases_configure: {
          order: 8002,
        },
      },
    });

    expect(deepLinks).toEqual({
      id: 'cases',
      path: '/cases',
      title: 'Cases',
      visibleIn: [],
      deepLinks: [
        {
          id: 'cases_create',
          path: '/cases/create',
          title: 'Create',
          visibleIn: [],
        },
        {
          id: 'cases_configure',
          path: '/cases/configure',
          title: 'Settings',
          order: 8002,
        },
      ],
    });
  });

  it('it does not overrides the id, the path, and the deepLinks', () => {
    const deepLinks = getCasesDeepLinks({
      extend: {
        cases: {
          id: 'cases_override',
          path: 'cases_path_override',
          deepLinks: [],
        },
        cases_create: {
          id: 'cases_create_override',
          path: 'cases_create_path_override',
        },
        cases_configure: {
          id: 'cases_configure_override',
          path: 'cases_configure_path_override',
        },
      },
    });

    expect(deepLinks).toEqual({
      id: 'cases',
      path: '/cases',
      title: 'Cases',
      deepLinks: [
        {
          id: 'cases_create',
          path: '/cases/create',
          title: 'Create',
        },
        {
          id: 'cases_configure',
          path: '/cases/configure',
          title: 'Settings',
        },
      ],
    });
  });

  it('it overrides the title correctly', () => {
    const deepLinks = getCasesDeepLinks({
      extend: {
        cases: {
          title: 'My new cases title',
        },
        cases_create: {
          title: 'My new create cases title',
        },
        cases_configure: {
          title: 'My new settings title',
        },
      },
    });

    expect(deepLinks).toEqual({
      id: 'cases',
      path: '/cases',
      title: 'My new cases title',
      deepLinks: [
        {
          id: 'cases_create',
          path: '/cases/create',
          title: 'My new create cases title',
        },
        {
          id: 'cases_configure',
          path: '/cases/configure',
          title: 'My new settings title',
        },
      ],
    });
  });
});
