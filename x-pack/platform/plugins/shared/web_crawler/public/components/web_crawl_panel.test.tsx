/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import {
  WEB_CRAWLS_PATH,
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
  WEB_CRAWL_MAX_DEPTH_LIMIT,
  WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
} from '../../common/constants';
import type { WebCrawl, WebCrawlStartRequest } from '../../common/types';
import { WEB_CRAWL_ID_KEY_SUFFIX } from '../hooks/use_web_crawl';
import {
  TEST_STORAGE_KEY_PREFIX,
  createHttpError,
  createTestQueryClient,
  createWebCrawl,
  renderWithWebCrawlerContext,
} from '../test_utils';
import type { WebCrawlPanelProps } from '../types';
import { WebCrawlPanel } from './web_crawl_panel';
import { INVALID_PATHS_MESSAGE } from './web_crawl_path_rules';

const INDEX_NAME = 'web-crawl-example-com';
const STORAGE_KEY = `${TEST_STORAGE_KEY_PREFIX}.${WEB_CRAWL_ID_KEY_SUFFIX}`;
const INDEX_DETAILS_URL = '/app/r?l=INDEX_MANAGEMENT_LOCATOR_ID';
const INVALID_URL_MESSAGE = 'Enter a URL that starts with http:// or https://';
const INVALID_LIMITS_MESSAGE = `Max depth must be a whole number from 0 to ${WEB_CRAWL_MAX_DEPTH_LIMIT}, and max pages from 1 to ${WEB_CRAWL_MAX_DOCUMENTS_LIMIT}.`;

describe('WebCrawlPanel', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  const indexManagementLocator = sharePluginMock.createLocator();
  const share = sharePluginMock.createStartContract();
  const getLocator = jest.spyOn(share.url.locators, 'get');

  const renderPanel = (
    onManageWebCrawls?: () => void,
    optionsDisplay?: WebCrawlPanelProps['optionsDisplay']
  ) =>
    renderWithWebCrawlerContext(
      <QueryClientProvider client={createTestQueryClient()}>
        <WebCrawlPanel />
      </QueryClientProvider>,
      { services: { http, share }, config: { onManageWebCrawls, optionsDisplay } }
    );

  const renderWithStoredCrawl = async (crawl: WebCrawl) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(crawl.id));
    http.get.mockResolvedValue(crawl);
    renderPanel();

    return screen.findByTestId('webCrawlStatus');
  };

  const getUrlInput = () => screen.getByTestId('webCrawlUrl');
  const getSubmitButton = () => screen.getByTestId('webCrawlSubmit');
  const getMaxDepthInput = () => screen.getByTestId('webCrawlMaxDepth');
  const getMaxDocumentsInput = () => screen.getByTestId('webCrawlMaxDocuments');

  const getIncludePathsInput = () => screen.getByTestId('webCrawlIncludePaths');
  const getExcludePathsInput = () => screen.getByTestId('webCrawlExcludePaths');

  const getIndexNameInput = () => screen.getByTestId('webCrawlIndexName');
  const getSeedUrlsInput = () => screen.getByTestId('webCrawlSeedUrls');
  const getSitemapUrlsInput = () => screen.getByTestId('webCrawlSitemapUrls');

  // The form always sends the path and URL lists, empty when the user entered none, and the index
  // name only when the user entered one.
  const expectStartRequest = ({
    url,
    maxDepth,
    maxDocuments,
    includePaths = [],
    excludePaths = [],
    indexName,
    seedUrls = [],
    sitemapUrls = [],
  }: WebCrawlStartRequest) =>
    expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
      body: JSON.stringify({
        url,
        maxDepth,
        maxDocuments,
        includePaths,
        excludePaths,
        indexName,
        seedUrls,
        sitemapUrls,
      }),
    });

  const submitUrl = (url: string) => {
    fireEvent.change(getUrlInput(), { target: { value: url } });
    fireEvent.click(getSubmitButton());
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    http = httpServiceMock.createStartContract();
    indexManagementLocator.getRedirectUrl.mockReturnValue(INDEX_DETAILS_URL);
    getLocator.mockImplementation((id) =>
      id === INDEX_MANAGEMENT_LOCATOR_ID ? indexManagementLocator : undefined
    );
  });

  it('renders an enabled form and no status when no crawl was started', () => {
    renderPanel();

    expect(getUrlInput()).toBeEnabled();
    expect(getSubmitButton()).toBeEnabled();
    expect(getMaxDepthInput()).toBeEnabled();
    expect(getMaxDepthInput()).toHaveValue(WEB_CRAWL_DEFAULT_MAX_DEPTH);
    expect(getMaxDepthInput()).not.toHaveAttribute('aria-invalid', 'true');
    expect(getMaxDocumentsInput()).toBeEnabled();
    expect(getMaxDocumentsInput()).toHaveValue(WEB_CRAWL_DEFAULT_MAX_DOCUMENTS);
    expect(getMaxDocumentsInput()).not.toHaveAttribute('aria-invalid', 'true');
    expect(getIncludePathsInput()).toBeEnabled();
    expect(getIncludePathsInput()).toHaveValue('');
    expect(getIncludePathsInput()).not.toBeInvalid();
    expect(getExcludePathsInput()).toBeEnabled();
    expect(getExcludePathsInput()).toHaveValue('');
    expect(getExcludePathsInput()).not.toBeInvalid();
    for (const input of [getIndexNameInput(), getSeedUrlsInput(), getSitemapUrlsInput()]) {
      expect(input).toBeEnabled();
      expect(input).toHaveValue('');
      expect(input).not.toBeInvalid();
    }
    expect(getSubmitButton()).toHaveAttribute('data-telemetry-id', 'testHost-home-webCrawl-start');
    expect(screen.queryByTestId('webCrawlStatus')).not.toBeInTheDocument();
    expect(http.get).not.toHaveBeenCalled();
  });

  it('gives every input an accessible name', () => {
    renderPanel();

    expect(screen.getByRole('textbox', { name: 'Crawl a website' })).toBe(getUrlInput());
    expect(
      screen.getByRole('spinbutton', {
        name: `Maximum number of links away from the URL, 0 to ${WEB_CRAWL_MAX_DEPTH_LIMIT}`,
      })
    ).toBe(getMaxDepthInput());
    expect(
      screen.getByRole('spinbutton', {
        name: `Maximum number of pages to index, 1 to ${WEB_CRAWL_MAX_DOCUMENTS_LIMIT}`,
      })
    ).toBe(getMaxDocumentsInput());
    expect(
      screen.getByRole('textbox', {
        name: 'Only crawl pages under these paths, separated by commas',
      })
    ).toBe(getIncludePathsInput());
    expect(
      screen.getByRole('textbox', {
        name: 'Do not crawl pages under these paths, separated by commas',
      })
    ).toBe(getExcludePathsInput());
    expect(screen.getByRole('textbox', { name: 'Index' })).toBe(getIndexNameInput());
    expect(screen.getByRole('textbox', { name: 'More start URLs' })).toBe(getSeedUrlsInput());
    expect(screen.getByRole('textbox', { name: 'Sitemap URLs' })).toBe(getSitemapUrlsInput());
    expect(screen.getByRole('button', { name: 'Crawl' })).toBe(getSubmitButton());
  });

  describe('collapsed options', () => {
    it('shows the limits beside the URL unless the host asks otherwise', () => {
      renderPanel();

      expect(screen.queryByTestId('webCrawlAdvancedOptions')).not.toBeInTheDocument();
      expect(getMaxDocumentsInput()).toBeVisible();
    });

    it('starts a crawl from the URL alone, with the default limits, and shows its status', async () => {
      http.post.mockResolvedValue(createWebCrawl());
      http.get.mockResolvedValue(createWebCrawl({ documentsCount: 3 }));
      renderPanel(undefined, 'collapsed');

      expect(screen.getByRole('button', { name: 'Advanced options' })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() =>
        expectStartRequest({
          url: 'https://example.com',
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        })
      );
      expect(await screen.findByTestId('webCrawlStatus')).toBeInTheDocument();
    });

    it("shows the server's refusal next to the URL while the options stay closed", async () => {
      http.post.mockRejectedValue(
        createHttpError('No document_extraction inference endpoint is available')
      );
      renderPanel(undefined, 'collapsed');

      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      fireEvent.click(getSubmitButton());

      expect(
        await screen.findByText('No document_extraction inference endpoint is available')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Advanced options' })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });
  });

  describe('validation', () => {
    it.each(['ftp://x', 'not a url', '', '   ', 'example.com', 'file:///etc/hosts'])(
      'rejects %p without starting a crawl',
      (url) => {
        renderPanel();

        submitUrl(url);

        expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
        expect(getUrlInput()).toBeInvalid();
        expect(http.post).not.toHaveBeenCalled();
      }
    );

    it('clears the validation error when the URL is edited', () => {
      renderPanel();
      submitUrl('not a url');
      expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();

      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });

      expect(screen.queryByText(INVALID_URL_MESSAGE)).not.toBeInTheDocument();
      expect(getUrlInput()).not.toBeInvalid();
    });
  });

  describe('crawl limits', () => {
    beforeEach(() => {
      http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));
    });

    it('submits the defaults when the limits are untouched', async () => {
      renderPanel();

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expectStartRequest({ url: 'https://example.com', maxDepth: 2, maxDocuments: 500 });
    });

    it('submits the limits the user entered', async () => {
      renderPanel();
      fireEvent.change(getMaxDepthInput(), { target: { value: '4' } });
      fireEvent.change(getMaxDocumentsInput(), { target: { value: '25' } });

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expectStartRequest({ url: 'https://example.com', maxDepth: 4, maxDocuments: 25 });
    });

    it.each([
      { maxDepth: 0, maxDocuments: 1 },
      { maxDepth: WEB_CRAWL_MAX_DEPTH_LIMIT, maxDocuments: WEB_CRAWL_MAX_DOCUMENTS_LIMIT },
    ])('submits the boundary values %p', async ({ maxDepth, maxDocuments }) => {
      renderPanel();
      fireEvent.change(getMaxDepthInput(), { target: { value: String(maxDepth) } });
      fireEvent.change(getMaxDocumentsInput(), { target: { value: String(maxDocuments) } });

      expect(getMaxDepthInput()).not.toHaveAttribute('aria-invalid', 'true');
      expect(getMaxDocumentsInput()).not.toHaveAttribute('aria-invalid', 'true');

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({ url: 'https://example.com', maxDepth, maxDocuments });
    });

    it.each(['-1', '6', '1.5', ''])(
      'marks a max depth of %p invalid and does not start a crawl',
      (value) => {
        renderPanel();
        fireEvent.change(getMaxDepthInput(), { target: { value } });

        submitUrl('https://example.com');

        expect(getMaxDepthInput()).toHaveAttribute('aria-invalid', 'true');
        expect(getMaxDocumentsInput()).not.toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText(INVALID_LIMITS_MESSAGE)).toBeInTheDocument();
        expect(http.post).not.toHaveBeenCalled();
      }
    );

    it.each(['0', '-1', '1001', '1.5', ''])(
      'marks a max pages of %p invalid and does not start a crawl',
      (value) => {
        renderPanel();
        fireEvent.change(getMaxDocumentsInput(), { target: { value } });

        submitUrl('https://example.com');

        expect(getMaxDocumentsInput()).toHaveAttribute('aria-invalid', 'true');
        expect(getMaxDepthInput()).not.toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByText(INVALID_LIMITS_MESSAGE)).toBeInTheDocument();
        expect(http.post).not.toHaveBeenCalled();
      }
    );

    it('starts the crawl once an invalid limit is corrected', async () => {
      renderPanel();
      fireEvent.change(getMaxDepthInput(), { target: { value: '9' } });
      submitUrl('https://example.com');
      expect(http.post).not.toHaveBeenCalled();

      fireEvent.change(getMaxDepthInput(), { target: { value: '1' } });
      expect(screen.queryByText(INVALID_LIMITS_MESSAGE)).not.toBeInTheDocument();
      fireEvent.click(getSubmitButton());

      await screen.findByTestId('webCrawlStatus');
      expect(getMaxDepthInput()).not.toHaveAttribute('aria-invalid', 'true');
      expectStartRequest({ url: 'https://example.com', maxDepth: 1, maxDocuments: 500 });
    });
  });

  describe('path rules', () => {
    const createPaths = (count: number) =>
      Array.from({ length: count }, (_, index) => `/p${index}`);
    const setIncludePaths = (value: string) =>
      fireEvent.change(getIncludePathsInput(), { target: { value } });
    const setExcludePaths = (value: string) =>
      fireEvent.change(getExcludePathsInput(), { target: { value } });

    beforeEach(() => {
      http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));
    });

    it('submits empty path lists when the paths are untouched', async () => {
      renderPanel();

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://example.com',
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
          includePaths: [],
          excludePaths: [],
          seedUrls: [],
          sitemapUrls: [],
        }),
      });
    });

    it('submits the paths the user entered, without blanks or duplicates', async () => {
      renderPanel();
      setIncludePaths('/docs, /blog,/docs  /guide,');
      setExcludePaths(' /docs/archive\t/tags ');

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: ['/docs', '/blog', '/guide'],
        excludePaths: ['/docs/archive', '/tags'],
      });
    });

    it('submits the paths along with the limits the user entered', async () => {
      renderPanel();
      fireEvent.change(getMaxDepthInput(), { target: { value: '1' } });
      fireEvent.change(getMaxDocumentsInput(), { target: { value: '30' } });
      setExcludePaths('/search');

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 1,
        maxDocuments: 30,
        includePaths: [],
        excludePaths: ['/search'],
      });
    });

    it.each([
      ['webCrawlIncludePaths', 'docs'],
      ['webCrawlIncludePaths', '/docs, blog'],
      ['webCrawlExcludePaths', 'tags'],
      ['webCrawlExcludePaths', '/tags search'],
    ])('marks %s of %p invalid and does not start a crawl', (testSubj, value) => {
      renderPanel();
      fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

      submitUrl('https://example.com');

      expect(screen.getByTestId(testSubj)).toBeInvalid();
      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('submits 20 paths', async () => {
      renderPanel();
      const paths = createPaths(20);
      setIncludePaths(paths.join(', '));

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: paths,
      });
    });

    it('does not start a crawl with 21 paths', () => {
      renderPanel();
      setIncludePaths(createPaths(21).join(', '));

      submitUrl('https://example.com');

      expect(getIncludePathsInput()).toBeInvalid();
      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('submits a path of 256 characters but not one of 257', async () => {
      renderPanel();
      const longestPath = `/${'a'.repeat(255)}`;
      setExcludePaths(`${longestPath}a`);

      submitUrl('https://example.com');

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(http.post).not.toHaveBeenCalled();

      setExcludePaths(longestPath);
      fireEvent.click(getSubmitButton());

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        excludePaths: [longestPath],
      });
    });

    it('starts the crawl once invalid paths are corrected', async () => {
      renderPanel();
      setIncludePaths('docs');
      submitUrl('https://example.com');
      expect(http.post).not.toHaveBeenCalled();

      setIncludePaths('/docs');
      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      fireEvent.click(getSubmitButton());

      await screen.findByTestId('webCrawlStatus');
      expect(getIncludePathsInput()).not.toBeInvalid();
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: ['/docs'],
      });
    });

    it('reports invalid limits before invalid paths', () => {
      renderPanel();
      setIncludePaths('docs');
      fireEvent.change(getMaxDocumentsInput(), { target: { value: '0' } });

      submitUrl('https://example.com');

      expect(screen.getByText(INVALID_LIMITS_MESSAGE)).toBeInTheDocument();
      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(http.post).not.toHaveBeenCalled();
    });

    it("shows invalid paths instead of the server's error from the last start", async () => {
      http.post.mockRejectedValue(createHttpError('The URL is not reachable'));
      renderPanel();
      submitUrl('https://example.com');
      expect(await screen.findByText('The URL is not reachable')).toBeInTheDocument();

      setExcludePaths('tags');

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(screen.queryByText('The URL is not reachable')).not.toBeInTheDocument();
    });
  });

  describe('crawl targets', () => {
    const INVALID_INDEX_NAME_MESSAGE =
      'Start with a lowercase letter or a digit, and use only lowercase letters, digits, dots, hyphens and underscores.';
    const INVALID_URLS_MESSAGE = 'Enter up to 20 URLs that start with http:// or https://';
    const createUrls = (count: number) =>
      Array.from({ length: count }, (_, index) => `https://example.com/p${index}`);
    const createUrlOfLength = (length: number) => {
      const prefix = 'https://example.com/';
      return `${prefix}${'a'.repeat(length - prefix.length)}`;
    };
    const setIndexName = (value: string) =>
      fireEvent.change(getIndexNameInput(), { target: { value } });
    const setSeedUrls = (value: string) =>
      fireEvent.change(getSeedUrlsInput(), { target: { value } });
    const setSitemapUrls = (value: string) =>
      fireEvent.change(getSitemapUrlsInput(), { target: { value } });
    const openTargets = () => fireEvent.click(screen.getByText('Index, start URLs and sitemaps'));

    beforeEach(() => {
      http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));
    });

    it('keeps the targets out of sight until they are opened', () => {
      renderPanel();

      expect(getIndexNameInput()).not.toBeVisible();
      expect(getSeedUrlsInput()).not.toBeVisible();
      expect(getSitemapUrlsInput()).not.toBeVisible();

      openTargets();

      expect(getIndexNameInput()).toBeVisible();
      expect(getSeedUrlsInput()).toBeVisible();
      expect(getSitemapUrlsInput()).toBeVisible();
    });

    it('submits empty URL lists and no index name when the targets are untouched', async () => {
      renderPanel();

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://example.com',
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
          includePaths: [],
          excludePaths: [],
          seedUrls: [],
          sitemapUrls: [],
        }),
      });
      expect(http.post).toHaveBeenCalledWith(
        WEB_CRAWLS_PATH,
        expect.objectContaining({ body: expect.not.stringContaining('indexName') })
      );
    });

    it('submits the index, start URLs and sitemap URLs the user entered', async () => {
      renderPanel();
      openTargets();
      setIndexName('  docs ');
      setSeedUrls('https://example.com/blog, https://docs.example.com  https://example.com/blog');
      setSitemapUrls(' https://example.com/sitemap-docs.xml ');

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://example.com',
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
          includePaths: [],
          excludePaths: [],
          indexName: 'docs',
          seedUrls: ['https://example.com/blog', 'https://docs.example.com'],
          sitemapUrls: ['https://example.com/sitemap-docs.xml'],
        }),
      });
    });

    it('submits the targets along with the limits and paths the user entered', async () => {
      renderPanel();
      fireEvent.change(getMaxDepthInput(), { target: { value: '1' } });
      fireEvent.change(getMaxDocumentsInput(), { target: { value: '40' } });
      fireEvent.change(getIncludePathsInput(), { target: { value: '/docs' } });
      setIndexName('docs');
      setSeedUrls('https://docs.example.com/x,y');

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 1,
        maxDocuments: 40,
        includePaths: ['/docs'],
        indexName: 'docs',
        seedUrls: ['https://docs.example.com/x,y'],
      });
    });

    it('leaves the index name out when it is blank', async () => {
      renderPanel();
      setIndexName('   ');
      setSeedUrls('https://docs.example.com');

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        seedUrls: ['https://docs.example.com'],
      });
      expect(http.post).toHaveBeenCalledWith(
        WEB_CRAWLS_PATH,
        expect.objectContaining({ body: expect.not.stringContaining('indexName') })
      );
    });

    it.each(['Docs', '.docs', '-docs', '_docs', 'my docs', 'a'.repeat(256)])(
      'does not start a crawl into an index named %p',
      (value) => {
        renderPanel();
        openTargets();
        setIndexName(value);

        submitUrl('https://example.com');

        expect(screen.getByText(INVALID_INDEX_NAME_MESSAGE)).toBeVisible();
        expect(getIndexNameInput()).toBeInvalid();
        expect(getSeedUrlsInput()).not.toBeInvalid();
        expect(getSitemapUrlsInput()).not.toBeInvalid();
        expect(http.post).not.toHaveBeenCalled();
      }
    );

    it('starts a crawl into an index with a name of 255 characters', async () => {
      renderPanel();
      const longestName = 'a'.repeat(255);
      setIndexName(longestName);

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        indexName: longestName,
      });
    });

    it.each([
      ['webCrawlSeedUrls', 'webCrawlSitemapUrls', 'docs.example.com'],
      ['webCrawlSeedUrls', 'webCrawlSitemapUrls', 'https://a.example ftp://b.example'],
      ['webCrawlSitemapUrls', 'webCrawlSeedUrls', '/sitemap.xml'],
      ['webCrawlSitemapUrls', 'webCrawlSeedUrls', 'file:///sitemap.xml'],
    ])('does not start a crawl with %s set to %p', (testSubj, otherSubj, value) => {
      renderPanel();
      openTargets();
      fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

      submitUrl('https://example.com');

      expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(1);
      expect(screen.getByTestId(testSubj)).toBeInvalid();
      expect(screen.getByTestId(otherSubj)).not.toBeInvalid();
      expect(http.post).not.toHaveBeenCalled();
    });

    it('submits 20 start URLs and 20 sitemap URLs', async () => {
      renderPanel();
      const urls = createUrls(20);
      setSeedUrls(urls.join(' '));
      setSitemapUrls(urls.join(', '));

      submitUrl('https://example.com');

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        seedUrls: urls,
        sitemapUrls: urls,
      });
    });

    it.each(['webCrawlSeedUrls', 'webCrawlSitemapUrls'])(
      'does not start a crawl with 21 URLs in %s',
      (testSubj) => {
        renderPanel();
        fireEvent.change(screen.getByTestId(testSubj), {
          target: { value: createUrls(21).join(' ') },
        });

        submitUrl('https://example.com');

        expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeInTheDocument();
        expect(screen.getByTestId(testSubj)).toBeInvalid();
        expect(http.post).not.toHaveBeenCalled();
      }
    );

    it('submits a start URL of 2048 characters but not one of 2049', async () => {
      renderPanel();
      const longestUrl = createUrlOfLength(2048);
      setSeedUrls(`${longestUrl}a`);

      submitUrl('https://example.com');

      expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeInTheDocument();
      expect(http.post).not.toHaveBeenCalled();

      setSeedUrls(longestUrl);
      fireEvent.click(getSubmitButton());

      await screen.findByTestId('webCrawlStatus');
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        seedUrls: [longestUrl],
      });
    });

    it('starts the crawl once invalid targets are corrected', async () => {
      renderPanel();
      openTargets();
      setIndexName('Docs');
      setSitemapUrls('sitemap.xml');
      submitUrl('https://example.com');
      expect(http.post).not.toHaveBeenCalled();

      setIndexName('docs');
      setSitemapUrls('https://example.com/sitemap.xml');

      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();

      fireEvent.click(getSubmitButton());

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expectStartRequest({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        indexName: 'docs',
        sitemapUrls: ['https://example.com/sitemap.xml'],
      });
    });

    it('disables the targets while the start request is in flight', async () => {
      http.post.mockReturnValue(new Promise(() => {}));
      renderPanel();
      setIndexName('docs');

      submitUrl('https://example.com');

      await waitFor(() => expect(getIndexNameInput()).toBeDisabled());
      expect(getSeedUrlsInput()).toBeDisabled();
      expect(getSitemapUrlsInput()).toBeDisabled();
      expect(getIndexNameInput()).toHaveValue('docs');
    });
  });

  describe('starting a crawl', () => {
    it('submits the trimmed URL and shows the status of the new crawl', async () => {
      http.post.mockResolvedValue(createWebCrawl({ status: 'completed', documentsCount: 4 }));
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed', documentsCount: 4 }));
      renderPanel();

      submitUrl('  https://example.com/docs  ');

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expectStartRequest({
        url: 'https://example.com/docs',
        maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
        maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
      });
      expect(await screen.findByTestId('webCrawlStatus')).toHaveTextContent(
        'Crawled https://example.com: 4 pages indexed.'
      );
      expect(screen.queryByText(INVALID_URL_MESSAGE)).not.toBeInTheDocument();
    });

    it('accepts http URLs', async () => {
      http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      renderPanel();

      submitUrl('http://example.com');

      await waitFor(() =>
        expectStartRequest({
          url: 'http://example.com',
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        })
      );
      await screen.findByTestId('webCrawlStatus');
    });

    it('starts the crawl when the form is submitted from the keyboard', async () => {
      http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      renderPanel();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });

      const form = getUrlInput().closest('form');
      expect(form).not.toBeNull();
      fireEvent.submit(form as HTMLFormElement);

      await screen.findByTestId('webCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
    });

    it('disables the form while the start request is in flight', async () => {
      let resolveStart: (crawl: WebCrawl) => void = () => {};
      http.post.mockReturnValue(
        new Promise((resolve) => {
          resolveStart = resolve;
        })
      );
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      renderPanel();

      submitUrl('https://example.com');

      await waitFor(() => expect(getUrlInput()).toBeDisabled());
      expect(getSubmitButton()).toBeDisabled();
      expect(getMaxDepthInput()).toBeDisabled();
      expect(getMaxDocumentsInput()).toBeDisabled();
      expect(getIncludePathsInput()).toBeDisabled();
      expect(getExcludePathsInput()).toBeDisabled();

      resolveStart(createWebCrawl({ status: 'completed' }));

      await screen.findByTestId('webCrawlStatus');
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
      expect(getMaxDepthInput()).toBeEnabled();
      expect(getMaxDocumentsInput()).toBeEnabled();
      expect(getIncludePathsInput()).toBeEnabled();
      expect(getExcludePathsInput()).toBeEnabled();
    });

    it("displays the server's error when the crawl cannot be started", async () => {
      http.post.mockRejectedValue(createHttpError('The URL is not reachable'));
      renderPanel();

      submitUrl('https://example.com');

      expect(await screen.findByText('The URL is not reachable')).toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlStatus')).not.toBeInTheDocument();
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
    });

    it('falls back to the generic error when the failure carries no server message', async () => {
      http.post.mockRejectedValue(new Error('Network down'));
      renderPanel();

      submitUrl('https://example.com');

      expect(await screen.findByText('Network down')).toBeInTheDocument();
    });

    it('replaces the status of the earlier crawl with the one just started', async () => {
      await renderWithStoredCrawl(
        createWebCrawl({ id: 'crawl-0', url: 'https://old.example', status: 'completed' })
      );
      const started = createWebCrawl({ id: 'crawl-2', url: 'https://new.example' });
      http.post.mockResolvedValue(started);
      http.get.mockResolvedValue(started);

      submitUrl('https://new.example');

      await waitFor(() =>
        expect(screen.getByTestId('webCrawlStatus')).toHaveTextContent(
          'Crawling https://new.example: 0 pages indexed so far.'
        )
      );
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('crawl-2'));
    });
  });

  describe('crawl status', () => {
    it('keeps the form enabled and reports progress while a crawl is running', async () => {
      const status = await renderWithStoredCrawl(createWebCrawl({ documentsCount: 1 }));

      expect(status).toHaveTextContent('Crawling https://example.com: 1 page indexed so far.');
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
      expect(getMaxDepthInput()).toBeEnabled();
      expect(getMaxDocumentsInput()).toBeEnabled();
    });

    it('requests the stored crawl by its id', async () => {
      await renderWithStoredCrawl(createWebCrawl({ id: 'odd/id', status: 'completed' }));

      expect(http.get).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/odd%2Fid`);
    });

    it('reports the page count of a completed crawl', async () => {
      const status = await renderWithStoredCrawl(
        createWebCrawl({ status: 'completed', documentsCount: 37 })
      );

      expect(status).toHaveTextContent('Crawled https://example.com: 37 pages indexed.');
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
      expect(getMaxDepthInput()).toBeEnabled();
      expect(getMaxDocumentsInput()).toBeEnabled();
    });

    it('reports the page count of a stopped crawl', async () => {
      const status = await renderWithStoredCrawl(
        createWebCrawl({ status: 'canceled', documentsCount: 1 })
      );

      expect(status).toHaveTextContent('Stopped crawling https://example.com: 1 page indexed.');
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
    });

    it('reports the error of a failed crawl', async () => {
      const status = await renderWithStoredCrawl(
        createWebCrawl({ status: 'failed', documentsCount: 2, error: 'Reader quota exceeded' })
      );

      expect(status).toHaveTextContent(
        'Crawling https://example.com failed after 2 pages: Reader quota exceeded'
      );
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
    });

    it('announces the status to assistive technology', async () => {
      await renderWithStoredCrawl(createWebCrawl({ status: 'completed', documentsCount: 3 }));

      expect(screen.getByRole('status')).toHaveTextContent(
        'Crawled https://example.com: 3 pages indexed.'
      );
    });

    it('shows no status when the stored crawl no longer exists', async () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify('crawl-gone'));
      http.get.mockRejectedValue(createHttpError('Crawl [crawl-gone] not found', 404));
      renderPanel();

      await waitFor(() => expect(http.get).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/crawl-gone`));
      await waitFor(() => expect(http.get.mock.results[0].type).toBe('return'));

      expect(screen.queryByTestId('webCrawlStatus')).not.toBeInTheDocument();
      expect(screen.queryByText('Crawl [crawl-gone] not found')).not.toBeInTheDocument();
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
    });

    it('links to the index details and navigates there in-app when clicked', async () => {
      await renderWithStoredCrawl(createWebCrawl({ status: 'completed', documentsCount: 3 }));

      const link = screen.getByTestId('webCrawlIndexLink');
      expect(link).toHaveTextContent(INDEX_NAME);
      expect(link).toHaveAttribute('href', INDEX_DETAILS_URL);
      expect(link).toHaveAttribute('data-telemetry-id', 'testHost-home-webCrawl-openIndex');
      expect(getLocator).toHaveBeenCalledWith(INDEX_MANAGEMENT_LOCATOR_ID);
      expect(indexManagementLocator.getRedirectUrl).toHaveBeenCalledWith({
        page: 'index_details',
        indexName: INDEX_NAME,
      });

      const wasDefaultAllowed = fireEvent.click(link);

      expect(wasDefaultAllowed).toBe(false);
      expect(indexManagementLocator.navigate).toHaveBeenCalledTimes(1);
      expect(indexManagementLocator.navigate).toHaveBeenCalledWith({
        page: 'index_details',
        indexName: INDEX_NAME,
      });
    });

    it('renders the index name without a destination when the locator is unavailable', async () => {
      getLocator.mockReturnValue(undefined);
      await renderWithStoredCrawl(createWebCrawl({ status: 'completed', documentsCount: 3 }));

      const link = screen.getByTestId('webCrawlIndexLink');
      expect(link).toHaveTextContent(INDEX_NAME);
      expect(link).not.toHaveAttribute('href');

      fireEvent.click(link);

      expect(indexManagementLocator.navigate).not.toHaveBeenCalled();
    });
  });

  describe('managing crawls', () => {
    it('hides the manage button when the host supplies no crawl management route', () => {
      renderPanel();

      expect(screen.queryByTestId('webCrawlManage')).not.toBeInTheDocument();
    });

    it('opens the crawl management route of the host', () => {
      const onManageWebCrawls = jest.fn();
      renderPanel(onManageWebCrawls);

      const button = screen.getByTestId('webCrawlManage');
      expect(button).toHaveTextContent('Manage and schedule crawls');
      expect(button).toHaveAttribute('data-telemetry-id', 'testHost-home-webCrawl-manage');

      fireEvent.click(button);

      expect(onManageWebCrawls).toHaveBeenCalledTimes(1);
      expect(http.post).not.toHaveBeenCalled();
    });
  });
});
