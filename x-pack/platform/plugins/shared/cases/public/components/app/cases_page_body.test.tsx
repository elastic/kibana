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
import { CasesPageLayout } from './cases_page_layout';
import { CasesPageBody } from './cases_page_body';

describe('CasesPageBody', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders compact body padding when the route redesign is enabled', () => {
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
          <CasesPageLayout basePath="/cases">
            <CasesPageBody>{'Cases body'}</CasesPageBody>
          </CasesPageLayout>
        </MemoryRouter>
      </TestProviders>
    );

    expect(screen.getByTestId('casesPageBody')).toBeInTheDocument();
  });

  it('does not add a body wrapper for legacy routes', () => {
    jest.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      casesRedesign: {
        list: false,
        details: false,
        settings: false,
      },
    } as ReturnType<typeof KibanaServices.getConfig>);

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/cases']}>
          <CasesPageLayout basePath="/cases">
            <CasesPageBody>{'Cases body'}</CasesPageBody>
          </CasesPageLayout>
        </MemoryRouter>
      </TestProviders>
    );

    expect(screen.queryByTestId('casesPageBody')).not.toBeInTheDocument();
    expect(screen.getByText('Cases body')).toBeInTheDocument();
  });
});
