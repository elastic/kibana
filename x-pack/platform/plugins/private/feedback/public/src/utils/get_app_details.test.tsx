/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { ChromeNavLink } from '@kbn/core/public';
import { getAppDetails } from './get_app_details';

const coreStartMock = coreMock.createStart();

const createMockNavLink = (
  partial: Partial<ChromeNavLink> & Pick<ChromeNavLink, 'id' | 'title' | 'url'>
): ChromeNavLink => ({
  baseUrl: partial.url,
  href: partial.url,
  visibleIn: ['globalSearch'],
  ...partial,
});

const setWindowLocation = (pathname: string, hash = '') => {
  Object.defineProperty(window, 'location', {
    value: {
      pathname,
      origin: 'http://localhost:5601',
      href: `http://localhost:5601${pathname}${hash}`,
      hash,
    },
    writable: true,
  });
};

const discoverNavLink = (overrides: Partial<ChromeNavLink> = {}): ChromeNavLink =>
  createMockNavLink({
    id: 'discover',
    title: 'Discover',
    url: '/app/discover',
    category: {
      id: 'analytics',
      label: 'Analytics',
      order: 1000,
    },
    ...overrides,
  });

describe('getAppDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should match by exact URL', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'discover',
        title: 'Discover',
        url: '/app/discover',
      }),
      createMockNavLink({
        id: 'dashboard',
        title: 'Dashboard',
        url: '/app/dashboard',
      }),
    ];

    setWindowLocation('/app/discover');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Discover',
      id: 'discover',
      url: '/app/discover',
    });
  });

  it('should match by URL prefix when no exact match', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'discover',
        title: 'Discover',
        url: '/app/discover',
      }),
      createMockNavLink({
        id: 'dashboard',
        title: 'Dashboard',
        url: '/app/dashboard',
      }),
    ];

    setWindowLocation('/app/dashboard/view/123');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Dashboard',
      id: 'dashboard',
      url: '/app/dashboard/view/123',
    });
  });

  it('should include category in title when category exists', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'discover',
        title: 'Discover',
        url: '/app/discover',
        category: {
          id: 'analytics',
          label: 'Analytics',
          order: 1000,
        },
      }),
    ];

    setWindowLocation('/app/discover');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Analytics - Discover',
      id: 'discover',
      url: '/app/discover',
    });
  });

  it('should not include category when category is undefined', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'discover',
        title: 'Discover',
        url: '/app/discover',
      }),
    ];

    setWindowLocation('/app/discover');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Discover',
      id: 'discover',
      url: '/app/discover',
    });
  });

  it('should return "Kibana" if no match is found', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'discover',
        title: 'Discover',
        url: '/app/discover',
      }),
    ];

    setWindowLocation('/app/unknown/path');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Kibana',
      id: 'Kibana',
      url: '/app/unknown/path',
    });
  });

  it('should return "Kibana" when navLinks is empty', () => {
    setWindowLocation('/app/testApp');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue([]);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Kibana',
      id: 'Kibana',
      url: '/app/testApp',
    });
  });

  it('should strip hash from navLink URL when matching', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'dashboards',
        title: 'Dashboards',
        url: '/s/test/app/dashboards#/list',
      }),
    ];

    setWindowLocation('/s/test/app/dashboards');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Dashboards',
      id: 'dashboards',
      url: '/s/test/app/dashboards',
    });
  });

  it('should match most specific navLink URL for deep links', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'slos',
        title: 'SLOs',
        url: '/app/slos',
      }),
      createMockNavLink({
        id: 'slos-welcome',
        title: 'SLOs Welcome',
        url: '/app/slos/welcome',
      }),
    ];

    setWindowLocation('/app/slos/welcome');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'SLOs Welcome',
      id: 'slos-welcome',
      url: '/app/slos/welcome',
    });
  });

  it('should use titleOverride as a full title replacement', () => {
    setWindowLocation('/app/discover');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue([discoverNavLink()]);

    const result = getAppDetails(coreStartMock, { isEsql: true }, 'Analytics - Discover ES|QL');

    expect(result).toEqual({
      title: 'Analytics - Discover ES|QL',
      id: 'discover',
      url: '/app/discover',
      context: { isEsql: true },
    });
  });

  it('should omit empty context from the result', () => {
    setWindowLocation('/app/discover');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue([discoverNavLink()]);

    expect(getAppDetails(coreStartMock, {})).toEqual({
      title: 'Analytics - Discover',
      id: 'discover',
      url: '/app/discover',
    });
  });

  it('should keep the derived title when no title override is provided', () => {
    setWindowLocation('/app/dashboard');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue([
      createMockNavLink({
        id: 'dashboard',
        title: 'Dashboard',
        url: '/app/dashboard',
        category: {
          id: 'analytics',
          label: 'Analytics',
          order: 1000,
        },
      }),
    ]);

    const result = getAppDetails(coreStartMock, { isEsql: true });

    expect(result).toEqual({
      title: 'Analytics - Dashboard',
      id: 'dashboard',
      url: '/app/dashboard',
      context: { isEsql: true },
    });
  });

  it('should ignore an empty title override', () => {
    setWindowLocation('/app/discover');
    coreStartMock.chrome.navLinks.getAll.mockReturnValue([discoverNavLink()]);

    expect(getAppDetails(coreStartMock, { isEsql: true }, '')).toEqual({
      title: 'Analytics - Discover',
      id: 'discover',
      url: '/app/discover',
      context: { isEsql: true },
    });
  });
});
