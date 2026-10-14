/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { ElasticsearchHomeProvider } from './context';
import type { ElasticsearchHomePageProps, ElasticsearchHomeServices } from './types';

/** The provider resolves default config from `docLinks`, so every test needs it. */
const baseServices = { docLinks: docLinksServiceMock.createStartContract() };

export const TEST_STORAGE_KEY_PREFIX = 'testHost.home';

export const testConfig: ElasticsearchHomePageProps = {
  telemetryPrefix: 'testHost-home',
  storageKeyPrefix: TEST_STORAGE_KEY_PREFIX,
  docsLink: { href: 'https://elastic.co/docs/test', label: 'Learn more about Elasticsearch' },
  ideSetup: {
    prompt: 'Install the Elastic skills',
    agentInitialMessage: '/elasticsearch-onboarding',
    agentSessionTag: 'test-home',
  },
};

interface HomeTestContextOptions {
  /** Only the services a component under test actually reads need to be supplied. */
  services?: Partial<ElasticsearchHomeServices>;
  config?: Partial<ElasticsearchHomePageProps>;
}

const HomeTestContext = ({
  services = {},
  config = {},
  children,
}: PropsWithChildren<HomeTestContextOptions>) => (
  <EuiThemeProvider>
    <I18nProvider>
      <ElasticsearchHomeProvider
        // a component only reads the handful of services it needs, so a partial stands in
        services={{ ...baseServices, ...services } as ElasticsearchHomeServices}
        config={{ ...testConfig, ...config }}
      >
        {children}
      </ElasticsearchHomeProvider>
    </I18nProvider>
  </EuiThemeProvider>
);

/** Renders a home page component inside the providers its plugin would supply at runtime. */
export const renderWithHomeContext = (ui: ReactElement, options: HomeTestContextOptions = {}) =>
  render(<HomeTestContext {...options}>{ui}</HomeTestContext>);

/** Wrapper for `renderHook`, for hooks that read the home page's services or config. */
export const homeContextWrapper =
  (options: HomeTestContextOptions = {}) =>
  ({ children }: PropsWithChildren) =>
    <HomeTestContext {...options}>{children}</HomeTestContext>;
