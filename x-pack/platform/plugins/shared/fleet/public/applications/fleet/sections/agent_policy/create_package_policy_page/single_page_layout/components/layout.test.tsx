/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';

import type { PackageInfo } from '../../../../../types';

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
    leftColumn,
    rightColumn,
    children,
  }: {
    restrictWidth?: number;
    restrictHeaderWidth?: number;
    leftColumn?: React.ReactNode;
    rightColumn?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div
      data-test-subj="withHeaderLayout"
      data-restrict-width={String(restrictWidth)}
      data-restrict-header-width={String(restrictHeaderWidth)}
    >
      {leftColumn}
      {rightColumn}
      {children}
    </div>
  ),
}));

jest.mock('../../../../../components', () => ({
  PackageIcon: () => null,
}));

const packageInfo: PackageInfo = {
  name: 'nginx',
  title: 'Nginx',
  version: '1.0.0',
  description: '',
  format_version: '',
  owner: { github: '' },
  latestVersion: '',
  assets: { kibana: undefined, elasticsearch: undefined },
  status: 'not_installed',
};

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
  it.each(['edit', 'package-edit', 'installed-integrations'] as const)(
    'shows the edit context when opened from %s',
    (from) => {
      render(
        <I18nProvider>
          <CreatePackagePolicySinglePageLayout from={from} cancelUrl="/" packageInfo={packageInfo}>
            form
          </CreatePackagePolicySinglePageLayout>
        </I18nProvider>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit Nginx integration');
      expect(
        screen.getByText(
          'Modify integration settings and deploy changes to the selected agent policies.'
        )
      ).toBeInTheDocument();
    }
  );

  it.each([packageInfo, undefined])(
    'shows upgrade context from Installed integrations with package details %p',
    (info) => {
      render(
        <I18nProvider>
          <CreatePackagePolicySinglePageLayout
            from="upgrade-from-installed-integrations"
            cancelUrl="/"
            packageInfo={info}
          >
            form
          </CreatePackagePolicySinglePageLayout>
        </I18nProvider>
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        info ? 'Upgrade Nginx integration' : 'Upgrade integration'
      );
      expect(
        screen.getByText(
          'Upgrade this integration and deploy changes to the selected agent policies.'
        )
      ).toBeInTheDocument();
    }
  );

  it('shows the generic edit title without package details from Installed integrations', () => {
    render(
      <I18nProvider>
        <CreatePackagePolicySinglePageLayout from="installed-integrations" cancelUrl="/">
          form
        </CreatePackagePolicySinglePageLayout>
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit integration');
  });

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
