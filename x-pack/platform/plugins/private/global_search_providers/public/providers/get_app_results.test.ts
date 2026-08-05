/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicAppInfo } from '@kbn/core/public';
import { AppStatus, DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { AppLink } from './get_app_results';
import { appToResult, getAppResults, scoreApp } from './get_app_results';

const createApp = (props: Partial<PublicAppInfo> = {}): PublicAppInfo => ({
  id: 'app1',
  title: 'App 1',
  appRoute: '/app/app1',
  status: AppStatus.accessible,
  visibleIn: ['globalSearch'],
  chromeless: false,
  keywords: [],
  deepLinks: [],
  ...props,
});

const createAppLink = (props: Partial<PublicAppInfo> = {}): AppLink => ({
  id: props.id ?? 'app1',
  path: props.appRoute ?? '/app/app1',
  subLinkTitles: [],
  keywords: props.keywords ?? [], // start off with the top level app keywords
  app: createApp(props),
});

describe('getAppResults', () => {
  it('retrieves the matching results', () => {
    const apps = [
      createApp({ id: 'dashboard', title: 'dashboard' }),
      createApp({ id: 'visualize', title: 'visualize' }),
      createApp({
        id: 'dashboard_not_searchable',
        title: 'dashboard not searchable',
        visibleIn: [],
      }),
    ];

    const results = getAppResults('dashboard', apps);

    expect(results.length).toBe(1);
    expect(results[0]).toEqual(expect.objectContaining({ id: 'dashboard', score: 100 }));
  });

  it('creates multiple links for apps with deepLinks', () => {
    const apps = [
      createApp({
        deepLinks: [
          {
            id: 'sub1',
            title: 'Sub1',
            path: '/sub1',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
          },
          {
            id: 'sub2',
            title: 'Sub2',
            path: '/sub2',
            deepLinks: [
              {
                id: 'sub2sub1',
                title: 'Sub2Sub1',
                path: '/sub2/sub1',
                deepLinks: [],
                keywords: [],
                visibleIn: ['globalSearch'],
              },
            ],
            keywords: [],
            visibleIn: [],
          },
        ],
        keywords: [],
      }),
    ];

    const results = getAppResults('App 1', apps);

    expect(results.map(({ title }) => title)).toEqual([
      'App 1',
      'App 1 / Sub1',
      'App 1 / Sub2 / Sub2Sub1',
    ]);
  });

  it('deep links "category" and "icon" should take precedence over the same app properties', () => {
    const apps = [
      createApp({
        euiIconType: 'logoKibana',
        category: DEFAULT_APP_CATEGORIES.kibana,
        deepLinks: [
          {
            id: 'sub-observability',
            title: 'Sub Observability',
            path: '/sub-observability',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
          },
          {
            id: 'sub-security',
            title: 'Sub Security',
            path: '/sub-security',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
            euiIconType: 'logoSecurity',
            category: DEFAULT_APP_CATEGORIES.security,
          },
        ],
        keywords: [],
      }),
    ];

    const results = getAppResults('App 1', apps);
    const [appLink, observabilityLink, securityLink] = results;
    expect(appLink).toMatchObject({
      icon: 'logoKibana',
      meta: { categoryId: 'kibana', categoryLabel: 'Analytics' },
      title: 'App 1',
    });
    expect(observabilityLink).toMatchObject({
      icon: 'logoKibana',
      meta: { categoryId: 'kibana', categoryLabel: 'Analytics' },
      title: 'App 1 / Sub Observability',
    });
    expect(securityLink).toMatchObject({
      icon: 'logoSecurity',
      meta: { categoryId: 'securitySolution', categoryLabel: 'Security' },
      title: 'App 1 / Sub Security',
    });
  });

  it('only includes deepLinks when search term is non-empty', () => {
    const apps = [
      createApp({
        deepLinks: [
          {
            id: 'sub1',
            title: 'Sub1',
            path: '/sub1',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
          },
        ],
        keywords: [],
      }),
      createApp({
        id: 'AppNotSearchable',
        title: 'App 1 not searchable',
        visibleIn: [],
      }),
    ];

    expect(getAppResults('', apps).length).toBe(1);
    expect(getAppResults('App 1', apps).length).toBe(2);
  });

  it('retrieves the matching results from keywords', () => {
    const apps = [createApp({ deepLinks: [], keywords: ['One'] })];
    const results = getAppResults('One', apps);
    expect(results.map(({ title }) => title)).toEqual(['App 1']);
  });

  it('retrieves the matching results from deeplink keywords', () => {
    const apps = [
      createApp({
        deepLinks: [
          {
            id: 'sub1',
            title: 'Sub1',
            path: '/sub1',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
          },
          {
            id: 'sub2',
            title: 'Sub2',
            path: '/sub2',
            deepLinks: [
              {
                id: 'sub2sub1',
                title: 'Sub2Sub1',
                path: '/sub2/sub1',
                deepLinks: [],
                keywords: ['TwoOne'],
                visibleIn: ['globalSearch'],
              },
            ],
            keywords: ['two'],
            visibleIn: ['globalSearch'],
          },
        ],
        keywords: [],
      }),
    ];

    const results = getAppResults('TwoOne', apps);
    expect(results.map(({ title }) => title)).toEqual(['App 1 / Sub2 / Sub2Sub1']);
  });
});

describe('scoreApp', () => {
  describe('when the term is included in the title', () => {
    it('returns 100 if the app title is an exact match', () => {
      expect(scoreApp('dashboard', createAppLink({ title: 'dashboard' }))).toBe(100);
      expect(scoreApp('dashboard', createAppLink({ title: 'DASHBOARD' }))).toBe(100);
      expect(scoreApp('DASHBOARD', createAppLink({ title: 'DASHBOARD' }))).toBe(100);
      expect(scoreApp('dashBOARD', createAppLink({ title: 'DASHboard' }))).toBe(100);
    });

    it('returns 90 if the app title starts with the term', () => {
      expect(scoreApp('dash', createAppLink({ title: 'dashboard' }))).toBe(90);
      expect(scoreApp('DASH', createAppLink({ title: 'dashboard' }))).toBe(90);
    });

    it('returns 75 if the term in included in the app title', () => {
      expect(scoreApp('board', createAppLink({ title: 'dashboard' }))).toBe(75);
      expect(scoreApp('shboa', createAppLink({ title: 'dashboard' }))).toBe(75);
    });
  });

  describe('when the term is not included in the title', () => {
    it('returns the levenshtein ratio if superior or equal to 60', () => {
      expect(scoreApp('0123456789', createAppLink({ title: '012345' }))).toBe(60);
      expect(scoreApp('--1234567-', createAppLink({ title: '123456789' }))).toBe(60);
    });
    it('returns 0 if the levenshtein ratio is inferior to 60', () => {
      expect(scoreApp('0123456789', createAppLink({ title: '12345' }))).toBe(0);
      expect(scoreApp('1-2-3-4-5', createAppLink({ title: '123456789' }))).toBe(0);
    });
  });

  describe('when the term is included in the keywords but not in the title', () => {
    it(`returns 100 if one of the app meta keywords is an exact match`, () => {
      expect(
        scoreApp('bar', createAppLink({ title: 'foo', keywords: ['bar'], deepLinks: [] }))
      ).toBe(100);
      expect(
        scoreApp('bar', createAppLink({ title: 'foo', keywords: ['BAR'], deepLinks: [] }))
      ).toBe(100);
    });
    it(`returns 90 if any of the keywords start with the term`, () => {
      expect(
        scoreApp(
          'viz',
          createAppLink({ title: 'Foo', keywords: ['Vizualize', 'Viz view'], deepLinks: [] })
        )
      ).toBe(90);
    });
    it(`returns 75 if the term is included in any of the keywords`, () => {
      expect(
        scoreApp(
          'board',
          createAppLink({ title: 'Foo', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75);
      expect(
        scoreApp(
          'shboa',
          createAppLink({ title: 'Foo', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75);
    });
  });

  describe('when the term is included in the keywords and the title', () => {
    it('returns 100 if one of the app meta keywords and the title is an exact match', () => {
      expect(
        scoreApp('home', createAppLink({ title: 'Home', keywords: ['home'], deepLinks: [] }))
      ).toBe(100);
      expect(
        scoreApp('Home', createAppLink({ title: 'Home', keywords: ['HOME'], deepLinks: [] }))
      ).toBe(100);
    });
    it('returns 90 if either one of the keywords or the title start with the term', () => {
      expect(
        scoreApp(
          'vis',
          createAppLink({ title: 'Visualize', keywords: ['Visualise'], deepLinks: [] })
        )
      ).toBe(90);
    });
    it('returns 75 if the term is included in the title or any of the keywords', () => {
      expect(
        scoreApp(
          'board',
          createAppLink({ title: 'Dashboard', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75);
      expect(
        scoreApp(
          'shboa',
          createAppLink({ title: 'dashboard', keywords: ['dashboard app'], deepLinks: [] })
        )
      ).toBe(75);
    });
  });

  describe('when the term is not included in the title or the keywords', () => {
    it('returns the levenshtein ratio if superior or equal to 60', () => {
      expect(
        scoreApp(
          '0123456789',
          createAppLink({ title: '012345', keywords: ['0345', '9987'], deepLinks: [] })
        )
      ).toBe(60);
      expect(
        scoreApp(
          '--1234567-',
          createAppLink({ title: '123456789', keywords: ['--345--'], deepLinks: [] })
        )
      ).toBe(60);
    });
    it('returns 0 if the levenshtein ratio is inferior to 60', () => {
      expect(
        scoreApp(
          '0123456789',
          createAppLink({ title: '12345', keywords: ['12', '34'], deepLinks: [] })
        )
      ).toBe(0);
      expect(
        scoreApp(
          '1-2-3-4-5',
          createAppLink({ title: '123456789', keywords: ['12-789'], deepLinks: [] })
        )
      ).toBe(0);
    });
  });
});

describe('appToResult', () => {
  it('converts an app to a result', () => {
    const app = createAppLink({
      id: 'foo',
      title: 'Foo',
      euiIconType: 'fooIcon',
      appRoute: '/app/foo',
      category: DEFAULT_APP_CATEGORIES.security,
    });
    expect(appToResult(app, 42)).toEqual({
      id: 'foo',
      title: 'Foo',
      type: 'application',
      icon: 'fooIcon',
      url: '/app/foo',
      meta: {
        categoryId: DEFAULT_APP_CATEGORIES.security.id,
        categoryLabel: DEFAULT_APP_CATEGORIES.security.label,
      },
      score: 42,
    });
  });

  it('converts an app without category to a result', () => {
    const app = createAppLink({
      id: 'foo',
      title: 'Foo',
      euiIconType: 'fooIcon',
      appRoute: '/app/foo',
    });
    expect(appToResult(app, 42)).toEqual({
      id: 'foo',
      title: 'Foo',
      type: 'application',
      icon: 'fooIcon',
      url: '/app/foo',
      meta: {
        categoryId: null,
        categoryLabel: null,
      },
      score: 42,
    });
  });

  it('includes the app name in sub links', () => {
    const app = createApp();
    const appLink: AppLink = {
      id: 'app1-sub',
      app,
      path: '/sub1',
      subLinkTitles: ['Sub1'],
      keywords: [],
    };

    expect(appToResult(appLink, 42).title).toEqual('App 1 / Sub1');
  });

  it('does not include the app name in sub links for Stack Management', () => {
    const app = createApp({ id: 'management' });
    const appLink: AppLink = {
      id: 'management-sub',
      app,
      deepLinkId: 'sub',
      path: '/sub1',
      subLinkTitles: ['Sub1'],
      keywords: [],
    };

    expect(appToResult(appLink, 42).title).toEqual('Sub1');
  });

  it('keeps management section titles for nested deep links in classic chrome', () => {
    const app = createApp({ id: 'management' });
    const appLink: AppLink = {
      id: 'management-application_connections',
      app,
      deepLinkId: 'application_connections',
      path: '/security/application_connections',
      subLinkTitles: ['Security', 'Application connections'],
      keywords: [],
    };

    expect(appToResult(appLink, 42).title).toEqual('Security / Application connections');
    expect(appToResult(appLink, 42, { chromeStyle: 'classic' }).title).toEqual(
      'Security / Application connections'
    );
  });

  it('uses nav-tree titles for nested Stack Management deep links in project chrome', () => {
    const app = createApp({ id: 'management' });
    const appLink: AppLink = {
      id: 'management-application_connections',
      app,
      deepLinkId: 'application_connections',
      path: '/security/application_connections',
      subLinkTitles: ['Security', 'Application connections'],
      keywords: [],
    };
    const deepLinkNavPaths = new Map([
      [
        'management:application_connections',
        {
          titles: ['Admin and Settings', 'Access', 'Application connections'] as const,
        order: 0,
        },
      ],
    ]);

    expect(
      appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths }).title
    ).toEqual('Admin and Settings / Access / Application connections');
  });

  it('uses nav-tree titles for non-management deep links in project chrome', () => {
    const app = createApp({ id: 'discover', title: 'Discover' });
    const appLink: AppLink = {
      id: 'discover-search',
      app,
      deepLinkId: 'search',
      path: '/search',
      subLinkTitles: ['Search'],
      keywords: [],
    };
    const deepLinkNavPaths = new Map([
      ['discover:search', { titles: ['Analytics', 'Discover'] as const, order: 0 }],
    ]);

    expect(appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths }).title).toEqual(
      'Analytics / Discover'
    );
    expect(appToResult(appLink, 42).title).toEqual('Discover / Search');
  });

  it('uses nav-tree titles for top-level app links in project chrome', () => {
    const app = createApp({ id: 'maps', title: 'Maps' });
    const appLink: AppLink = {
      id: 'maps',
      app,
      path: '/app/maps',
      subLinkTitles: [],
      keywords: [],
    };
    const deepLinkNavPaths = new Map([['maps', { titles: ['Other tools', 'Maps'] as const, order: 0 }]]);

    expect(appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths }).title).toEqual(
      'Other tools / Maps'
    );
    expect(appToResult(appLink, 42).title).toEqual('Maps');
  });

  it('uses App category when panel category repeats the title root', () => {
    const app = createApp({
      id: 'ux',
      title: 'User Experience',
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
    });
    const appLink: AppLink = {
      id: 'ux',
      app,
      path: '/app/ux',
      subLinkTitles: [],
      keywords: [],
    };
    const deepLinkNavPaths = new Map([
      [
        'ux',
        { titles: ['Applications', 'User experience'] as const, order: 0, icon: 'spaces',
          categoryLabel: 'Applications',
        },
      ],
    ]);

    expect(appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths })).toEqual(
      expect.objectContaining({
        title: 'Applications / User experience',
        icon: 'spaces',
        meta: {
          categoryId: null,
          categoryLabel: 'App',
        },
      })
    );
  });

  it('keeps panel category when it differs from the title root', () => {
    const app = createApp({
      id: 'fleet',
      title: 'Fleet',
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
    });
    const appLink: AppLink = {
      id: 'fleet',
      app,
      path: '/app/fleet',
      subLinkTitles: [],
      keywords: [],
    };
    const deepLinkNavPaths = new Map([
      [
        'fleet',
        { titles: ['Ingest and integrations', 'Fleet'] as const, order: 0, icon: 'database',
          categoryLabel: 'Data management',
        },
      ],
    ]);

    expect(appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths })).toEqual(
      expect.objectContaining({
        title: 'Ingest and integrations / Fleet',
        icon: 'database',
        meta: {
          categoryId: null,
          categoryLabel: 'Data management',
        },
      })
    );
  });

  it('uses App category for top-level nav hits without a distinct panel label', () => {
    const app = createApp({
      id: 'maps',
      title: 'Maps',
      euiIconType: 'logoMaps',
      category: DEFAULT_APP_CATEGORIES.kibana,
    });
    const appLink: AppLink = {
      id: 'maps',
      app,
      path: '/app/maps',
      subLinkTitles: [],
      keywords: [],
    };
    const deepLinkNavPaths = new Map([['maps', { titles: ['Other tools', 'Maps'] as const, order: 0 }]]);

    expect(appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths })).toEqual(
      expect.objectContaining({
        icon: 'logoMaps',
        meta: {
          categoryId: null,
          categoryLabel: 'App',
        },
      })
    );
  });

  it('uses App category for top-level nav apps in project chrome', () => {
    const app = createApp({
      id: 'discover',
      title: 'Discover',
      euiIconType: 'productDiscover',
      category: DEFAULT_APP_CATEGORIES.kibana,
    });
    const appLink: AppLink = {
      id: 'discover',
      app,
      path: '/app/discover',
      subLinkTitles: [],
      keywords: [],
    };
    const deepLinkNavPaths = new Map([
      ['discover', { titles: ['Discover'] as const, order: 0, icon: 'productDiscover' }],
    ]);

    expect(appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths })).toEqual(
      expect.objectContaining({
        title: 'Discover',
        icon: 'productDiscover',
        meta: {
          categoryId: null,
          categoryLabel: 'App',
        },
      })
    );
  });

  it('falls back to the leaf title for management in project chrome when nav is unavailable', () => {
    const app = createApp({ id: 'management' });
    const appLink: AppLink = {
      id: 'management-application_connections',
      app,
      deepLinkId: 'application_connections',
      path: '/security/application_connections',
      subLinkTitles: ['Security', 'Application connections'],
      keywords: [],
    };

    expect(
      appToResult(appLink, 42, { chromeStyle: 'project', deepLinkNavPaths: null }).title
    ).toEqual('Application connections');
  });
});

describe('getAppResults project nav scoping', () => {
  it('excludes apps that are not in the nav tree', () => {
    const apps = [
      createApp({
        id: 'significant_events',
        title: 'Significant Events',
        category: DEFAULT_APP_CATEGORIES.management,
      }),
      createApp({ id: 'discover', title: 'Discover' }),
    ];
    const deepLinkNavPaths = new Map([
      ['discover', { titles: ['Discover'] as const, order: 0, icon: 'productDiscover' }],
    ]);

    const results = getAppResults('e', apps, {
      chromeStyle: 'project',
      deepLinkNavPaths,
    });

    expect(results.map(({ id }) => id)).toEqual(['discover']);
  });

  it('includes deep links that are in the nav tree', () => {
    const apps = [
      createApp({
        id: 'management',
        title: 'Stack Management',
        deepLinks: [
          {
            id: 'application_connections',
            title: 'Application connections',
            path: '/security/application_connections',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
          },
        ],
      }),
    ];
    const deepLinkNavPaths = new Map([
      [
        'management:application_connections',
        {
          titles: ['Admin and Settings', 'Access', 'Application connections'] as const,
        order: 0,
        },
      ],
    ]);

    const results = getAppResults('application', apps, {
      chromeStyle: 'project',
      deepLinkNavPaths,
    });

    expect(results).toEqual([
      expect.objectContaining({
        id: 'management-application_connections',
        title: 'Admin and Settings / Access / Application connections',
      }),
    ]);
  });

  it('does not apply nav scoping when deepLinkNavPaths is null', () => {
    const apps = [createApp({ id: 'orphan', title: 'Orphan App' })];

    const results = getAppResults('orphan', apps, {
      chromeStyle: 'project',
      deepLinkNavPaths: null,
    });

    expect(results).toEqual([
      expect.objectContaining({ id: 'orphan', title: 'Orphan App' }),
    ]);
  });

  it('includes deep links whose parent app is in the nav tree', () => {
    const apps = [
      createApp({
        id: 'fleet',
        title: 'Fleet',
        euiIconType: 'logoElastic',
        deepLinks: [
          {
            id: 'settings',
            title: 'Settings',
            path: '/settings',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
          },
        ],
      }),
    ];
    const deepLinkNavPaths = new Map([
      [
        'fleet',
        {
          titles: ['Data management', 'Ingest and integrations', 'Fleet'] as const,
          order: 0,
          icon: 'database',
          categoryLabel: 'Data management',
        },
      ],
    ]);

    const results = getAppResults('settings', apps, {
      chromeStyle: 'project',
      deepLinkNavPaths,
    });

    expect(results).toEqual([
      expect.objectContaining({
        id: 'fleet-settings',
        title: 'Data management / Ingest and integrations / Fleet / Settings',
        icon: 'database',
        meta: {
          categoryId: null,
          categoryLabel: 'Page',
        },
      }),
    ]);
  });

  it('still excludes deep links when neither they nor their parent app are in the nav', () => {
    const apps = [
      createApp({
        id: 'significant_events',
        title: 'Significant Events',
        deepLinks: [
          {
            id: 'knowledge_indicators',
            title: 'KIs',
            path: '/knowledge_indicators',
            deepLinks: [],
            keywords: [],
            visibleIn: ['globalSearch'],
          },
        ],
      }),
    ];

    const results = getAppResults('kis', apps, {
      chromeStyle: 'project',
      deepLinkNavPaths: new Map(),
    });

    expect(results).toEqual([]);
  });
});

describe('scoreApp with project nav titles', () => {
  const managementApp = createApp({ id: 'management', title: 'Stack Management' });
  const managementLink: AppLink = {
    id: 'management-application_connections',
    app: managementApp,
    deepLinkId: 'application_connections',
    path: '/security/application_connections',
    subLinkTitles: ['Security', 'Application connections'],
    keywords: [],
  };
  const discoverApp = createApp({ id: 'discover', title: 'Discover' });
  const discoverLink: AppLink = {
    id: 'discover-search',
    app: discoverApp,
    deepLinkId: 'search',
    path: '/search',
    subLinkTitles: ['Search'],
    keywords: [],
  };
  const deepLinkNavPaths = new Map([
    [
      'management:application_connections',
      {
        titles: ['Admin and Settings', 'Access', 'Application connections'] as const,
      order: 0,
      },
    ],
    ['discover:search', { titles: ['Analytics', 'Discover'] as const, order: 0 }],
  ]);
  const projectOptions = { chromeStyle: 'project' as const, deepLinkNavPaths };

  it('matches nav-tree ancestor titles for management in project chrome', () => {
    expect(scoreApp('access', managementLink, projectOptions)).toBe(75);
    expect(scoreApp('admin and settings', managementLink, projectOptions)).toBe(90);
  });

  it('still matches registration section titles for management in project chrome', () => {
    expect(scoreApp('security', managementLink, projectOptions)).toBe(75);
  });

  it('matches nav-tree ancestor titles for non-management apps in project chrome', () => {
    expect(scoreApp('analytics', discoverLink, projectOptions)).toBe(90);
  });

  it('matches nav-tree ancestor titles for top-level apps in project chrome', () => {
    const mapsApp = createApp({ id: 'maps', title: 'Maps' });
    const mapsLink: AppLink = {
      id: 'maps',
      app: mapsApp,
      path: '/app/maps',
      subLinkTitles: [],
      keywords: [],
    };
    const mapsPaths = new Map([['maps', { titles: ['Other tools', 'Maps'] as const, order: 0 }]]);

    expect(
      scoreApp('other tools', mapsLink, { chromeStyle: 'project', deepLinkNavPaths: mapsPaths })
    ).toBe(90);
  });

  it('ranks empty search by nav order in project chrome', () => {
    const first = createApp({ id: 'discover', title: 'Discover' });
    const second = createApp({ id: 'dashboards', title: 'Dashboards' });
    const firstLink: AppLink = {
      id: 'discover',
      app: first,
      path: '/app/discover',
      subLinkTitles: [],
      keywords: [],
    };
    const secondLink: AppLink = {
      id: 'dashboards',
      app: second,
      path: '/app/dashboards',
      subLinkTitles: [],
      keywords: [],
    };
    const paths = new Map([
      ['discover', { titles: ['Discover'] as const, order: 0 }],
      ['dashboards', { titles: ['Dashboards'] as const, order: 1 }],
    ]);
    const options = { chromeStyle: 'project' as const, deepLinkNavPaths: paths };

    expect(scoreApp('', firstLink, options)).toBeGreaterThan(scoreApp('', secondLink, options));
  });
});
