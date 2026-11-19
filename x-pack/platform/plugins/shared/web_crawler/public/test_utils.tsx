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
import { QueryClient } from '@kbn/react-query';
import type { WebCrawl } from '../common/types';
import { WebCrawlerProvider } from './context';
import type { WebCrawlerConfig, WebCrawlerServices } from './types';

export const TEST_STORAGE_KEY_PREFIX = 'testHost.home';

export const testConfig: WebCrawlerConfig = {
  telemetryPrefix: 'testHost-home',
  storageKeyPrefix: TEST_STORAGE_KEY_PREFIX,
};

interface WebCrawlerTestContextOptions {
  /** Only the services a component under test actually reads need to be supplied. */
  services?: Partial<WebCrawlerServices>;
  config?: Partial<WebCrawlerConfig>;
}

const WebCrawlerTestContext = ({
  services = {},
  config = {},
  children,
}: PropsWithChildren<WebCrawlerTestContextOptions>) => (
  <EuiThemeProvider>
    <I18nProvider>
      <WebCrawlerProvider
        // a component only reads the handful of services it needs, so a partial stands in
        services={services as WebCrawlerServices}
        config={{ ...testConfig, ...config }}
      >
        {children}
      </WebCrawlerProvider>
    </I18nProvider>
  </EuiThemeProvider>
);

/** Renders a crawler component inside the providers its plugin would supply at runtime. */
export const renderWithWebCrawlerContext = (
  ui: ReactElement,
  options: WebCrawlerTestContextOptions = {}
) => render(<WebCrawlerTestContext {...options}>{ui}</WebCrawlerTestContext>);

/** Wrapper for `renderHook`, for hooks that read the crawler's services or config. */
export const webCrawlerContextWrapper =
  (options: WebCrawlerTestContextOptions = {}) =>
  ({ children }: PropsWithChildren) =>
    <WebCrawlerTestContext {...options}>{children}</WebCrawlerTestContext>;
/** A query client that fails fast and keeps expected request failures out of the test output. */
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });

export const createWebCrawl = (overrides: Partial<WebCrawl> = {}): WebCrawl => ({
  id: 'crawl-1',
  indexName: 'web-crawl-example-com',
  url: 'https://example.com',
  status: 'running',
  maxDepth: 2,
  maxDocuments: 500,
  includePaths: [],
  excludePaths: [],
  seedUrls: [],
  sitemapUrls: [],
  documentsCount: 0,
  failedCount: 0,
  requestedCount: 0,
  queuedCount: 0,
  skippedByRobotsCount: 0,
  skippedByRulesCount: 0,
  purgedCount: 0,
  startedAt: '2026-01-01T00:00:00.000Z',
  isStopping: false,
  ...overrides,
});

/** The shape of a Kibana HTTP error whose response body carries the server's message. */
export const createHttpError = (message: string, statusCode = 400) => ({
  name: 'Error',
  message: 'Request failed',
  body: { statusCode, message },
});
