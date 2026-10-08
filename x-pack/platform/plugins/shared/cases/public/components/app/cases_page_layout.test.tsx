/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestProviders } from '../../common/mock';
import { KibanaServices } from '../../common/lib/kibana';
import { CasesPageLayout, getCasesPageLayoutVariant } from './cases_page_layout';

const allRedesignFlags = {
  list: true,
  details: true,
  settings: true,
};

describe('CasesPageLayout', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['/cases', 'list', 'compact'],
    ['/cases/create', 'list', 'compact'],
    ['/cases/example-id', 'details', 'compact'],
    ['/cases/example-id/comment-id', 'details', 'compact'],
    ['/cases/configure', 'settings', 'compact'],
    ['/cases/configure/templates', 'settings', 'compact'],
    ['/cases/configure/field-library', 'settings', 'compact'],
    ['/', 'list', 'compact'],
  ] as const)(
    'maps %s to %s when casesRedesign.%s is enabled',
    (pathname, enabledFlag, expectedVariant) => {
      const basePath = pathname.startsWith('/cases') ? '/cases' : '/';

      expect(
        getCasesPageLayoutVariant({
          pathname,
          basePath,
          casesRedesign: {
            ...allRedesignFlags,
            [enabledFlag]: false,
          },
        })
      ).toBe('legacy');

      expect(
        getCasesPageLayoutVariant({
          pathname,
          basePath,
          casesRedesign: allRedesignFlags,
        })
      ).toBe(expectedVariant);
    }
  );

  it.each([
    ['/cases/configure/templates/create', '/cases'],
    ['/cases/configure/templates/example-id/edit', '/cases'],
    ['/configure/templates/create', '/'],
  ] as const)(
    'maps template editor path %s to fullHeight regardless of casesRedesign.settings',
    (pathname, basePath) => {
      expect(
        getCasesPageLayoutVariant({
          pathname,
          basePath,
          casesRedesign: { ...allRedesignFlags, settings: false },
        })
      ).toBe('fullHeight');

      expect(
        getCasesPageLayoutVariant({
          pathname,
          basePath,
          casesRedesign: allRedesignFlags,
        })
      ).toBe('fullHeight');
    }
  );

  it('applies legacy padding when the route redesign is disabled', () => {
    jest.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      casesRedesign: {
        list: false,
        details: true,
        settings: true,
      },
    } as ReturnType<typeof KibanaServices.getConfig>);

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/cases']}>
          <CasesPageLayout basePath="/cases">{'Cases content'}</CasesPageLayout>
        </MemoryRouter>
      </TestProviders>
    );

    const pageLayout = screen.getByTestId('casesPageLayout');
    expect(pageLayout).toHaveAttribute('data-layout-variant', 'legacy');
    expect(pageLayout).toHaveStyle({
      padding: '24px',
    });
  });

  it('does not apply outer padding for compact routes', () => {
    jest.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      casesRedesign: {
        list: true,
        details: false,
        settings: false,
      },
    } as ReturnType<typeof KibanaServices.getConfig>);

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/cases']}>
          <CasesPageLayout basePath="/cases">{'Cases content'}</CasesPageLayout>
        </MemoryRouter>
      </TestProviders>
    );

    const pageLayout = screen.getByTestId('casesPageLayout');
    expect(pageLayout).toHaveAttribute('data-layout-variant', 'compact');
    expect(pageLayout).not.toHaveStyle({
      padding: '24px',
    });
  });
});
