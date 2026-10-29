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
import { CasesPageLayout } from './cases_page_layout';
import { CasesPageBody } from './cases_page_body';

const renderBody = (pathname: string) =>
  render(
    <TestProviders>
      <MemoryRouter initialEntries={[pathname]}>
        <CasesPageLayout basePath="/cases">
          <CasesPageBody>{'Cases body'}</CasesPageBody>
        </CasesPageLayout>
      </MemoryRouter>
    </TestProviders>
  );

describe('CasesPageBody', () => {
  it('renders compact body padding on a standard cases route', () => {
    renderBody('/cases');

    expect(screen.getByTestId('casesPageBody')).toBeInTheDocument();
  });

  it('does not add a body wrapper for full height routes', () => {
    renderBody('/cases/configure/templates/create');

    expect(screen.queryByTestId('casesPageBody')).not.toBeInTheDocument();
    expect(screen.getByText('Cases body')).toBeInTheDocument();
  });
});
