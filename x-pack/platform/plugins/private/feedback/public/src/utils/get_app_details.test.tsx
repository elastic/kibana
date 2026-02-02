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

    coreStartMock.executionContext.get.mockReturnValue({
      name: 'discover',
      url: '/app/discover',
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Discover',
      id: 'discover',
      url: '/app/discover',
    });
  });

  it('should fallback to matching by name if no URL match is found', () => {
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

    coreStartMock.executionContext.get.mockReturnValue({
      name: 'dashboard',
      url: '/some/other/url',
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Dashboard',
      id: 'dashboard',
      url: '/some/other/url',
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

    coreStartMock.executionContext.get.mockReturnValue({
      name: 'discover',
      url: '/app/discover',
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: '[Analytics] Discover',
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

    coreStartMock.executionContext.get.mockReturnValue({
      name: 'discover',
      url: '/app/discover',
    });
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

    coreStartMock.executionContext.get.mockReturnValue({
      name: 'unknownApp',
      url: '/app/unknown/path',
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Kibana',
      id: 'Kibana',
      url: '/app/unknown/path',
    });
  });

  it('should return "Kibana" when navLinks is empty', () => {
    coreStartMock.executionContext.get.mockReturnValue({
      name: 'testApp',
      url: '/app/testApp',
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue([]);

    const result = getAppDetails(coreStartMock);

    expect(result).toEqual({
      title: 'Kibana',
      id: 'Kibana',
      url: '/app/testApp',
    });
  });

  it('should clear execution context before getting app details', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'discover',
        title: 'Discover',
        url: '/app/discover',
      }),
    ];

    coreStartMock.executionContext.get.mockReturnValue({
      name: 'discover',
      url: '/app/discover',
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    getAppDetails(coreStartMock);

    expect(coreStartMock.executionContext.clear).toHaveBeenCalledTimes(1);
  });

  it('should preserve the executionContext URL in the result', () => {
    const navLinks: ChromeNavLink[] = [
      createMockNavLink({
        id: 'discover',
        title: 'Discover',
        url: '/app/discover',
      }),
    ];

    const executionUrl = '/app/discover/view/123?query=test';
    coreStartMock.executionContext.get.mockReturnValue({
      name: 'discover',
      url: executionUrl,
    });
    coreStartMock.chrome.navLinks.getAll.mockReturnValue(navLinks);

    const result = getAppDetails(coreStartMock);

    expect(result.url).toBe(executionUrl);
  });
});
