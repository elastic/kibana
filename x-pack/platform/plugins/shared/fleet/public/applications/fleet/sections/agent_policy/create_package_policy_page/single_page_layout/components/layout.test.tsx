/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';

import { CreatePackagePolicySinglePageLayout } from './layout';

jest.mock('../hooks/setup_technology', () => ({
  useAgentless: () => ({
    isAgentlessAgentPolicy: () => false,
  }),
}));

jest.mock('../../../../../layouts', () => ({
  WithHeaderLayout: ({
    restrictWidth,
    restrictHeaderWidth,
    children,
  }: {
    restrictWidth?: number;
    restrictHeaderWidth?: number;
    children?: React.ReactNode;
  }) => (
    <div
      data-test-subj="withHeaderLayout"
      data-restrict-width={String(restrictWidth)}
      data-restrict-header-width={String(restrictHeaderWidth)}
    >
      {children}
    </div>
  ),
}));

jest.mock('../../../../../components', () => ({
  PackageIcon: () => null,
}));

const renderLayout = (useWidePageLayout?: boolean) =>
  render(
    <I18nProvider>
      <CreatePackagePolicySinglePageLayout
        from="package"
        cancelUrl="/"
        useWidePageLayout={useWidePageLayout}
      >
        form
      </CreatePackagePolicySinglePageLayout>
    </I18nProvider>
  );

describe('CreatePackagePolicySinglePageLayout', () => {
  it('defaults page width to 800', () => {
    renderLayout();

    const layout = screen.getByTestId('withHeaderLayout');
    expect(layout).toHaveAttribute('data-restrict-width', '800');
    expect(layout).toHaveAttribute('data-restrict-header-width', '800');
  });

  it('uses EUI default page width when requested', () => {
    renderLayout(true);

    const layout = screen.getByTestId('withHeaderLayout');
    expect(layout).toHaveAttribute('data-restrict-width', '1200');
    expect(layout).toHaveAttribute('data-restrict-header-width', '1200');
  });
});
