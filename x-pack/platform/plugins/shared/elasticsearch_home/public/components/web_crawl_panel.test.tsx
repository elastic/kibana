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
  renderWithHomeContext,
} from '../test_utils';
import { WebCrawlPanel } from './web_crawl_panel';

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

  const renderPanel = (onManageWebCrawls?: () => void) =>
    renderWithHomeContext(
      <QueryClientProvider client={createTestQueryClient()}>
        <WebCrawlPanel />
      </QueryClientProvider>,
      { services: { http, share }, config: { onManageWebCrawls } }
    );

  const renderWithStoredCrawl = async (crawl: WebCrawl) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(crawl.id));
    http.get.mockResolvedValue(crawl);
    renderPanel();

    return screen.findByTestId('elasticsearchHomeWebCrawlStatus');
  };

  const getUrlInput = () => screen.getByTestId('elasticsearchHomeWebCrawlUrl');
  const getSubmitButton = () => screen.getByTestId('elasticsearchHomeWebCrawlSubmit');
  const getMaxDepthInput = () => screen.getByTestId('elasticsearchHomeWebCrawlMaxDepth');
  const getMaxDocumentsInput = () => screen.getByTestId('elasticsearchHomeWebCrawlMaxDocuments');

  const expectStartRequest = (request: WebCrawlStartRequest) =>
    expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, { body: JSON.stringify(request) });

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
    expect(getSubmitButton()).toHaveAttribute('data-telemetry-id', 'testHost-home-webCrawl-start');
    expect(screen.queryByTestId('elasticsearchHomeWebCrawlStatus')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Crawl' })).toBe(getSubmitButton());
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

      await screen.findByTestId('elasticsearchHomeWebCrawlStatus');
      expect(http.post).toHaveBeenCalledTimes(1);
      expectStartRequest({ url: 'https://example.com', maxDepth: 2, maxDocuments: 500 });
    });

    it('submits the limits the user entered', async () => {
      renderPanel();
      fireEvent.change(getMaxDepthInput(), { target: { value: '4' } });
      fireEvent.change(getMaxDocumentsInput(), { target: { value: '25' } });

      submitUrl('https://example.com');

      await screen.findByTestId('elasticsearchHomeWebCrawlStatus');
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

      await screen.findByTestId('elasticsearchHomeWebCrawlStatus');
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

      await screen.findByTestId('elasticsearchHomeWebCrawlStatus');
      expect(getMaxDepthInput()).not.toHaveAttribute('aria-invalid', 'true');
      expectStartRequest({ url: 'https://example.com', maxDepth: 1, maxDocuments: 500 });
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
      expect(await screen.findByTestId('elasticsearchHomeWebCrawlStatus')).toHaveTextContent(
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
      await screen.findByTestId('elasticsearchHomeWebCrawlStatus');
    });

    it('starts the crawl when the form is submitted from the keyboard', async () => {
      http.post.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      http.get.mockResolvedValue(createWebCrawl({ status: 'completed' }));
      renderPanel();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });

      const form = getUrlInput().closest('form');
      expect(form).not.toBeNull();
      fireEvent.submit(form as HTMLFormElement);

      await screen.findByTestId('elasticsearchHomeWebCrawlStatus');
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

      resolveStart(createWebCrawl({ status: 'completed' }));

      await screen.findByTestId('elasticsearchHomeWebCrawlStatus');
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
      expect(getMaxDepthInput()).toBeEnabled();
      expect(getMaxDocumentsInput()).toBeEnabled();
    });

    it("displays the server's error when the crawl cannot be started", async () => {
      http.post.mockRejectedValue(createHttpError('The URL is not reachable'));
      renderPanel();

      submitUrl('https://example.com');

      expect(await screen.findByText('The URL is not reachable')).toBeInTheDocument();
      expect(screen.queryByTestId('elasticsearchHomeWebCrawlStatus')).not.toBeInTheDocument();
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
        expect(screen.getByTestId('elasticsearchHomeWebCrawlStatus')).toHaveTextContent(
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

      expect(screen.queryByTestId('elasticsearchHomeWebCrawlStatus')).not.toBeInTheDocument();
      expect(screen.queryByText('Crawl [crawl-gone] not found')).not.toBeInTheDocument();
      expect(getUrlInput()).toBeEnabled();
      expect(getSubmitButton()).toBeEnabled();
    });

    it('links to the index details and navigates there in-app when clicked', async () => {
      await renderWithStoredCrawl(createWebCrawl({ status: 'completed', documentsCount: 3 }));

      const link = screen.getByTestId('elasticsearchHomeWebCrawlIndexLink');
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

      const link = screen.getByTestId('elasticsearchHomeWebCrawlIndexLink');
      expect(link).toHaveTextContent(INDEX_NAME);
      expect(link).not.toHaveAttribute('href');

      fireEvent.click(link);

      expect(indexManagementLocator.navigate).not.toHaveBeenCalled();
    });
  });

  describe('managing crawls', () => {
    it('hides the manage button when the host supplies no crawl management route', () => {
      renderPanel();

      expect(screen.queryByTestId('elasticsearchHomeWebCrawlManage')).not.toBeInTheDocument();
    });

    it('opens the crawl management route of the host', () => {
      const onManageWebCrawls = jest.fn();
      renderPanel(onManageWebCrawls);

      const button = screen.getByTestId('elasticsearchHomeWebCrawlManage');
      expect(button).toHaveTextContent('Manage and schedule crawls');
      expect(button).toHaveAttribute('data-telemetry-id', 'testHost-home-webCrawl-manage');

      fireEvent.click(button);

      expect(onManageWebCrawls).toHaveBeenCalledTimes(1);
      expect(http.post).not.toHaveBeenCalled();
    });
  });
});
