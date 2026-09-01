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
import { TestProviders } from '../../common/mock';
import { KibanaServices } from '../../common/lib/kibana';
import { CasesPageLayout } from './cases_page_layout';
import { CasesAppHeader } from './cases_app_header';

const renderHeader = (listRedesignEnabled: boolean) => {
  jest.spyOn(KibanaServices, 'getConfig').mockReturnValue({
    casesRedesign: {
      list: listRedesignEnabled,
      details: false,
      settings: false,
    },
  } as ReturnType<typeof KibanaServices.getConfig>);

  return render(
    <TestProviders>
      <MemoryRouter initialEntries={['/cases']}>
        <CasesPageLayout basePath="/cases">
          <CasesAppHeader title="Cases" />
        </CasesPageLayout>
      </MemoryRouter>
    </TestProviders>
  );
};

describe('CasesAppHeader', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses standard header spacing when the route redesign is enabled', () => {
    const { result } = renderHook(() => useEuiTheme());
    renderHeader(true);

    const header = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
    expect(header).toHaveStyleRule('padding-inline', result.current.euiTheme.size.base);
    expect(header).not.toHaveStyleRule('margin-top', expect.any(String));
    expect(header).not.toHaveStyleRule('margin-inline', expect.any(String));
  });

  it('uses flush header spacing when the legacy layout owns the gutter', () => {
    renderHeader(false);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).not.toHaveStyleRule(
      'padding-inline',
      expect.any(String)
    );
  });
});
