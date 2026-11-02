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
import { CasesPageLayout, getCasesPageLayoutVariant } from './cases_page_layout';

describe('CasesPageLayout', () => {
  it.each([
    ['/cases', '/cases'],
    ['/cases/create', '/cases'],
    ['/cases/example-id', '/cases'],
    ['/cases/example-id/comment-id', '/cases'],
    ['/cases/configure', '/cases'],
    ['/cases/configure/templates', '/cases'],
    ['/cases/configure/field-library', '/cases'],
    ['/', '/'],
  ] as const)('maps %s to compact', (pathname, basePath) => {
    expect(getCasesPageLayoutVariant({ pathname, basePath })).toBe('compact');
  });

  it.each([
    ['/cases/configure/templates/create', '/cases'],
    ['/cases/configure/templates/example-id/edit', '/cases'],
    ['/configure/templates/create', '/'],
  ] as const)('maps template editor path %s to fullHeight', (pathname, basePath) => {
    expect(getCasesPageLayoutVariant({ pathname, basePath })).toBe('fullHeight');
  });

  it('does not apply outer padding for compact routes', () => {
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

  it('grows the template editor to full height', () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/cases/configure/templates/create']}>
          <CasesPageLayout basePath="/cases">{'Cases content'}</CasesPageLayout>
        </MemoryRouter>
      </TestProviders>
    );

    const pageLayout = screen.getByTestId('casesPageLayout');
    expect(pageLayout).toHaveAttribute('data-layout-variant', 'fullHeight');
    expect(pageLayout).toHaveStyle({ flex: 1 });
  });
});
