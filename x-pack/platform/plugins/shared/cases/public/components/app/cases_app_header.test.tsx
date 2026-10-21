/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { AppHeaderProps } from '@kbn/app-header';
import { TestProviders } from '../../common/mock';
import { CasesPageLayout } from './cases_page_layout';
import { CasesAppHeader } from './cases_app_header';

const renderHeader = (spacing?: AppHeaderProps['spacing']) =>
  render(
    <TestProviders>
      <MemoryRouter initialEntries={['/cases']}>
        <CasesPageLayout basePath="/cases">
          <CasesAppHeader title="Cases" spacing={spacing} />
        </CasesPageLayout>
      </MemoryRouter>
    </TestProviders>
  );

describe('CasesAppHeader', () => {
  it('defaults to standard header spacing', () => {
    const { result } = renderHook(() => useEuiTheme());
    renderHeader();

    const header = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
    expect(header).toHaveStyleRule('padding-inline', result.current.euiTheme.size.base);
    expect(header).not.toHaveStyleRule('margin-top', expect.any(String));
    expect(header).not.toHaveStyleRule('margin-inline', expect.any(String));
  });

  it('lets an explicit spacing prop override the default', () => {
    renderHeader('flush');

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).not.toHaveStyleRule(
      'padding-inline',
      expect.any(String)
    );
  });
});
