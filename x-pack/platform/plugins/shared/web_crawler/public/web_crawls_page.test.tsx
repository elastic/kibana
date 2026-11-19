/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { INDEX_MANAGEMENT_LOCATOR_ID } from '@kbn/index-management-shared-types';
import { WEB_CRAWLS_PATH } from '../common/constants';
import type { WebCrawl } from '../common/types';
import { buildWebCrawlWorkflowYaml } from '../common/web_crawl_schedule';
import {
  createHttpError,
  createTestQueryClient,
  createWebCrawl,
  renderWithWebCrawlerContext,
} from './test_utils';
import { INVALID_PATHS_MESSAGE } from './components/web_crawl_path_rules';
import { WebCrawlsPage } from './web_crawls_page';

const WORKFLOWS_PATH = '/api/workflows';
const WORKFLOW_PATH = '/api/workflows/workflow';
const API_VERSION = '2023-10-31';

const STOP = 'webCrawlsStop';
const CRAWL_AGAIN = 'webCrawlsCrawlAgain';
const SCHEDULE = 'webCrawlsSchedule';
const DELETE = 'webCrawlsDelete';
const ERROR_CALLOUT = 'webCrawlsError';
const SCHEDULE_MODAL = 'webCrawlScheduleModal';
const MORE_START_URLS = 'webCrawlsMoreStartUrls';
const INVALID_INDEX_NAME_MESSAGE =
  'Start with a lowercase letter or a digit, and use only lowercase letters, digits, dots, hyphens and underscores.';
const INVALID_URLS_MESSAGE = 'Enter up to 20 URLs that start with http:// or https://';

interface WorkflowSummary {
  id: string;
  name: string;
  enabled: boolean;
}

interface RenderOptions {
  canReadWorkflows?: boolean;
  canCreateWorkflows?: boolean;
  hasWorkflowsApp?: boolean;
  onNavigateHome?: () => void;
}

const runningCrawl = createWebCrawl({
  id: 'running-1',
  url: 'https://running.example',
  indexName: 'web-crawl-running-example',
  startedAt: '2026-01-02T00:00:00.000Z',
});
const completedCrawl = createWebCrawl({
  id: 'completed-1',
  url: 'https://completed.example/docs',
  indexName: 'web-crawl-completed-example',
  status: 'completed',
  maxDepth: 4,
  maxDocuments: 120,
  documentsCount: 37,
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:02:05.000Z',
});

describe('WebCrawlsPage', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let application: ReturnType<typeof applicationServiceMock.createStartContract>;
  let crawls: WebCrawl[];
  let workflows: WorkflowSummary[];
  const indexManagementLocator = sharePluginMock.createLocator();
  const share = sharePluginMock.createStartContract();
  const getLocator = jest.spyOn(share.url.locators, 'get');

  const renderPage = async ({
    canReadWorkflows = true,
    canCreateWorkflows = true,
    hasWorkflowsApp = true,
    onNavigateHome,
  }: RenderOptions = {}) => {
    application.capabilities = {
      ...application.capabilities,
      workflowsManagement: { readWorkflow: canReadWorkflows, createWorkflow: canCreateWorkflows },
    };
    const chrome = chromeServiceMock.createStartContract();
    chrome.navLinks.has.mockImplementation((id: string) => hasWorkflowsApp && id === 'workflows');

    renderWithWebCrawlerContext(
      <QueryClientProvider client={createTestQueryClient()}>
        <WebCrawlsPage onNavigateHome={onNavigateHome} />
      </QueryClientProvider>,
      { services: { http, share, application, chrome } }
    );

    await waitFor(() => expect(http.get).toHaveBeenCalledWith(WEB_CRAWLS_PATH));
    await waitFor(() =>
      expect(screen.getByTestId('webCrawlsTable')).not.toHaveClass('euiBasicTable-loading')
    );
  };

  const findRow = async (url: string) => {
    const link = await screen.findByRole('link', {
      name: new RegExp(url.replace(/[./]/g, '\\$&')),
    });
    const row = link.closest('tr');
    if (!row) {
      throw new Error(`No table row for ${url}`);
    }
    return row;
  };

  // A row with more than two actions collapses them into a menu.
  const findRowAction = async (url: string, action: string) => {
    const row = await findRow(url);
    const toggle = within(row).queryByTestId('euiCollapsedItemActionsButton');
    if (!toggle) {
      return within(row).getByTestId(action);
    }
    fireEvent.click(toggle);
    return waitFor(() => {
      const menuItem = screen.getAllByTestId(action).find((element) => !element.closest('tr'));
      if (!menuItem) {
        throw new Error(`No ${action} in the actions menu of ${url}`);
      }
      return menuItem;
    });
  };

  const getWorkflowsRequests = () =>
    http.get.mock.calls.filter(([path]) => String(path) === WORKFLOWS_PATH);
  const getListRequests = () =>
    http.get.mock.calls.filter(([path]) => String(path) === WEB_CRAWLS_PATH);

  beforeEach(() => {
    jest.clearAllMocks();
    crawls = [runningCrawl, completedCrawl];
    workflows = [];
    http = httpServiceMock.createStartContract();
    http.get.mockImplementation(async (path) => {
      switch (String(path)) {
        case WEB_CRAWLS_PATH:
          return { crawls };
        case WORKFLOWS_PATH:
          return { results: workflows };
        default:
          throw new Error(`Unexpected GET ${String(path)}`);
      }
    });
    application = applicationServiceMock.createStartContract();
    application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );
    indexManagementLocator.getRedirectUrl.mockImplementation(
      ({ indexName }: { indexName?: string }) => `/app/indices/${indexName}`
    );
    getLocator.mockImplementation((id) =>
      id === INDEX_MANAGEMENT_LOCATOR_ID ? indexManagementLocator : undefined
    );
  });

  describe('layout', () => {
    it('renders the title, the crawl form and the crawls', async () => {
      await renderPage();

      expect(screen.getByRole('heading', { level: 1, name: 'Web crawls' })).toBeInTheDocument();
      expect(screen.getByTestId('webCrawlUrl')).toBeEnabled();
      expect(await findRow(runningCrawl.url)).toHaveTextContent('Running');
      expect(await findRow(completedCrawl.url)).toHaveTextContent('Completed');
    });

    it('tells how many more start URLs a crawl had, in its row only', async () => {
      crawls = [
        runningCrawl,
        {
          ...completedCrawl,
          seedUrls: ['https://completed.example/blog', 'https://docs.completed.example'],
        },
      ];
      await renderPage();

      expect(
        within(await findRow(completedCrawl.url)).getByTestId(MORE_START_URLS)
      ).toHaveTextContent('and 2 more start URLs');
      expect(
        within(await findRow(runningCrawl.url)).queryByTestId(MORE_START_URLS)
      ).not.toBeInTheDocument();
    });

    it('has no back link when the host supplies no home route', async () => {
      await renderPage();

      expect(screen.queryByTestId('webCrawlsBack')).not.toBeInTheDocument();
    });

    it("returns to the host's home page from the back link", async () => {
      const onNavigateHome = jest.fn();
      await renderPage({ onNavigateHome });

      const back = screen.getByTestId('webCrawlsBack');
      expect(back).toHaveTextContent('Back to home');
      expect(back).toHaveAttribute('data-telemetry-id', 'testHost-home-webCrawls-back');

      fireEvent.click(back);

      expect(onNavigateHome).toHaveBeenCalledTimes(1);
    });

    it('tells the user how to start when there are no crawls', async () => {
      crawls = [];
      await renderPage();

      expect(
        await screen.findByText('No crawls yet. Enter a URL above to start one.')
      ).toBeInTheDocument();
      expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument();
    });
  });

  describe('running count', () => {
    it('counts the running crawls', async () => {
      crawls = [
        runningCrawl,
        createWebCrawl({ id: 'running-2', url: 'https://other.example', isStopping: true }),
        completedCrawl,
      ];
      await renderPage();

      expect(await screen.findByTestId('webCrawlsRunningCount')).toHaveTextContent('2 running');
    });

    it('is hidden when no crawl is running', async () => {
      crawls = [completedCrawl, createWebCrawl({ id: 'failed-1', status: 'failed' })];
      await renderPage();

      await findRow(completedCrawl.url);
      expect(screen.queryByTestId('webCrawlsRunningCount')).not.toBeInTheDocument();
    });
  });

  describe('page counts', () => {
    it('breaks a running crawl down and reports a finished one against its limit', async () => {
      crawls = [
        { ...runningCrawl, documentsCount: 3, failedCount: 1, requestedCount: 6, queuedCount: 4 },
        { ...completedCrawl, failedCount: 2 },
      ];
      await renderPage();

      expect(await findRow(runningCrawl.url)).toHaveTextContent(
        '3 indexed, 2 in progress, 4 queued'
      );
      expect(await findRow(completedCrawl.url)).toHaveTextContent(
        '37 of at most 120 indexed, 2 failed'
      );
    });

    it('reports removed pages, a reached page limit and skipped links', async () => {
      crawls = [
        { ...runningCrawl, skippedByRobotsCount: 2 },
        {
          ...completedCrawl,
          requestedCount: 120,
          purgedCount: 4,
          skippedByRobotsCount: 1,
          skippedByRulesCount: 6,
        },
      ];
      await renderPage();

      const completedRow = await findRow(completedCrawl.url);
      expect(completedRow).toHaveTextContent('37 of at most 120 indexed, 4 removed');
      expect(within(completedRow).getByTestId('webCrawlsPageLimitReached')).toHaveTextContent(
        'Page limit reached'
      );
      expect(within(completedRow).getByTestId('webCrawlsSkipped')).toHaveTextContent(
        'Skipped links: 1 by robots.txt, 6 by path rules'
      );

      const runningRow = await findRow(runningCrawl.url);
      expect(within(runningRow).getByTestId('webCrawlsSkipped')).toHaveTextContent(
        'Skipped links: 2 by robots.txt, 0 by path rules'
      );
      expect(within(runningRow).queryByTestId('webCrawlsPageLimitReached')).not.toBeInTheDocument();
    });

    it('mentions neither a page limit nor skipped links for crawls without them', async () => {
      await renderPage();

      await findRow(completedCrawl.url);
      expect(screen.queryByTestId('webCrawlsPageLimitReached')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlsSkipped')).not.toBeInTheDocument();
    });
  });

  describe('index links', () => {
    it('links each index to its details', async () => {
      await renderPage();

      expect(
        await screen.findByRole('link', { name: 'web-crawl-completed-example' })
      ).toHaveAttribute('href', '/app/indices/web-crawl-completed-example');
      expect(indexManagementLocator.getRedirectUrl).toHaveBeenCalledWith({
        page: 'index_details',
        indexName: 'web-crawl-completed-example',
      });
    });

    it('shows index names without links when index management is unavailable', async () => {
      getLocator.mockReturnValue(undefined);
      await renderPage();

      expect(await screen.findByText('web-crawl-completed-example')).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'web-crawl-completed-example' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'web-crawl-running-example' })
      ).not.toBeInTheDocument();
    });
  });

  describe('list errors', () => {
    it("shows the server's message when the crawls cannot be loaded", async () => {
      http.get.mockRejectedValue(createHttpError('Crawl history is unavailable', 500));
      await renderPage({ canReadWorkflows: false });

      expect(await screen.findByTestId(ERROR_CALLOUT)).toHaveTextContent(
        'Crawl history is unavailable'
      );
      expect(screen.getByTestId('webCrawlUrl')).toBeEnabled();
    });

    it('falls back to the generic error when the failure carries no server message', async () => {
      http.get.mockRejectedValue(new Error('Network down'));
      await renderPage({ canReadWorkflows: false });

      expect(await screen.findByTestId(ERROR_CALLOUT)).toHaveTextContent('Network down');
    });
  });

  describe('starting a crawl', () => {
    const submitUrl = (url: string) => {
      fireEvent.change(screen.getByTestId('webCrawlUrl'), {
        target: { value: url },
      });
      fireEvent.click(screen.getByTestId('webCrawlSubmit'));
    };

    it('starts the crawl from the form and lists it', async () => {
      await renderPage();
      const startedCrawl = createWebCrawl({ id: 'running-2', url: 'https://new.example' });
      http.post.mockImplementation(async () => {
        crawls = [startedCrawl, ...crawls];
        return startedCrawl;
      });

      submitUrl('https://new.example');

      expect(await findRow('https://new.example')).toHaveTextContent('Running');
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://new.example',
          maxDepth: 2,
          maxDocuments: 500,
          includePaths: [],
          excludePaths: [],
          seedUrls: [],
          sitemapUrls: [],
        }),
      });
      expect(await screen.findByTestId('webCrawlsRunningCount')).toHaveTextContent('2 running');
    });

    it('starts the crawl with the paths entered in the form', async () => {
      await renderPage();
      http.post.mockResolvedValue(createWebCrawl({ id: 'running-2', url: 'https://new.example' }));
      fireEvent.change(screen.getByTestId('webCrawlIncludePaths'), {
        target: { value: '/docs, /blog /docs' },
      });
      fireEvent.change(screen.getByTestId('webCrawlExcludePaths'), {
        target: { value: '/docs/archive' },
      });

      submitUrl('https://new.example');

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://new.example',
          maxDepth: 2,
          maxDocuments: 500,
          includePaths: ['/docs', '/blog'],
          excludePaths: ['/docs/archive'],
          seedUrls: [],
          sitemapUrls: [],
        }),
      });
    });

    it('starts the crawl with the index, start URLs and sitemap URLs entered in the form', async () => {
      await renderPage();
      http.post.mockResolvedValue(createWebCrawl({ id: 'running-2', url: 'https://new.example' }));
      fireEvent.click(screen.getByText('Index, start URLs and sitemaps'));
      fireEvent.change(screen.getByTestId('webCrawlIndexName'), { target: { value: ' docs ' } });
      fireEvent.change(screen.getByTestId('webCrawlSeedUrls'), {
        target: {
          value: 'https://new.example/blog, https://docs.new.example https://new.example/blog',
        },
      });
      fireEvent.change(screen.getByTestId('webCrawlSitemapUrls'), {
        target: { value: 'https://new.example/sitemap-docs.xml' },
      });

      submitUrl('https://new.example');

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://new.example',
          maxDepth: 2,
          maxDocuments: 500,
          includePaths: [],
          excludePaths: [],
          indexName: 'docs',
          seedUrls: ['https://new.example/blog', 'https://docs.new.example'],
          sitemapUrls: ['https://new.example/sitemap-docs.xml'],
        }),
      });
    });

    it('leaves the choice of index to the server when the form names none', async () => {
      await renderPage();
      http.post.mockResolvedValue(createWebCrawl({ id: 'running-2', url: 'https://new.example' }));
      fireEvent.change(screen.getByTestId('webCrawlIndexName'), { target: { value: '  ' } });

      submitUrl('https://new.example');

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(
        WEB_CRAWLS_PATH,
        expect.objectContaining({ body: expect.not.stringContaining('indexName') })
      );
    });

    it.each([
      ['webCrawlIndexName', 'Docs', INVALID_INDEX_NAME_MESSAGE],
      ['webCrawlIndexName', '_docs', INVALID_INDEX_NAME_MESSAGE],
      ['webCrawlSeedUrls', 'docs.new.example', INVALID_URLS_MESSAGE],
      ['webCrawlSitemapUrls', 'ftp://new.example/sitemap.xml', INVALID_URLS_MESSAGE],
    ])(
      'does not start a crawl while %s in the form is set to %p',
      async (testSubj, value, message) => {
        await renderPage();
        fireEvent.click(screen.getByText('Index, start URLs and sitemaps'));
        fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

        submitUrl('https://new.example');

        expect(screen.getByText(message)).toBeVisible();
        expect(screen.getByTestId(testSubj)).toBeInvalid();
        expect(http.post).not.toHaveBeenCalled();
        expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument();
      }
    );

    it('does not start a crawl while the paths in the form are invalid', async () => {
      await renderPage();
      fireEvent.change(screen.getByTestId('webCrawlExcludePaths'), { target: { value: 'tags' } });

      submitUrl('https://new.example');

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(screen.getByTestId('webCrawlExcludePaths')).toBeInvalid();
      expect(http.post).not.toHaveBeenCalled();
      expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument();
    });

    it('keeps the form enabled while other crawls are running', async () => {
      await renderPage();

      await findRow(runningCrawl.url);
      expect(screen.getByTestId('webCrawlUrl')).toBeEnabled();
      expect(screen.getByTestId('webCrawlSubmit')).toBeEnabled();
    });

    it("shows the server's refusal in the form, not as a page error", async () => {
      await renderPage();
      http.post.mockRejectedValue(createHttpError('running.example is already being crawled', 409));

      submitUrl('https://running.example');

      expect(
        await screen.findByText('running.example is already being crawled')
      ).toBeInTheDocument();
      expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument();
      expect(getListRequests()).toHaveLength(1);
    });
  });

  describe('stopping a crawl', () => {
    it('asks the server to stop the crawl and shows it as stopping', async () => {
      await renderPage({ canCreateWorkflows: false });
      const stoppingCrawl = { ...runningCrawl, isStopping: true };
      http.post.mockImplementation(async () => {
        crawls = [stoppingCrawl, completedCrawl];
        return stoppingCrawl;
      });

      fireEvent.click(await findRowAction(runningCrawl.url, STOP));

      await waitFor(async () =>
        expect(await findRow(runningCrawl.url)).toHaveTextContent('Stopping')
      );
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/running-1/_cancel`);
      expect(within(await findRow(runningCrawl.url)).getByTestId(STOP)).toHaveAttribute(
        'aria-disabled',
        'true'
      );
      expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument();
    });

    it('offers no stop action for a crawl that is not running', async () => {
      await renderPage({ canCreateWorkflows: false });

      const row = await findRow(completedCrawl.url);

      expect(within(row).queryByTestId(STOP)).not.toBeInTheDocument();
    });

    it("shows the server's message when the crawl cannot be stopped", async () => {
      await renderPage({ canCreateWorkflows: false });
      http.post.mockRejectedValue(createHttpError('The crawl already finished', 409));

      fireEvent.click(await findRowAction(runningCrawl.url, STOP));

      expect(await screen.findByTestId(ERROR_CALLOUT)).toHaveTextContent(
        'The crawl already finished'
      );
    });

    it('falls back to the generic error when stopping fails without a server message', async () => {
      await renderPage({ canCreateWorkflows: false });
      http.post.mockRejectedValue(new Error('Network down'));

      fireEvent.click(await findRowAction(runningCrawl.url, STOP));

      expect(await screen.findByTestId(ERROR_CALLOUT)).toHaveTextContent('Network down');
    });
  });

  describe('deleting a crawl', () => {
    it('deletes the crawl and removes it from the list', async () => {
      await renderPage({ canCreateWorkflows: false });
      http.delete.mockImplementation(async () => {
        crawls = [runningCrawl];
      });

      fireEvent.click(await findRowAction(completedCrawl.url, DELETE));

      await waitFor(() =>
        expect(screen.queryByRole('link', { name: /completed\.example/ })).not.toBeInTheDocument()
      );
      expect(http.delete).toHaveBeenCalledTimes(1);
      expect(http.delete).toHaveBeenCalledWith(`${WEB_CRAWLS_PATH}/completed-1`);
      expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument();
    });

    it('offers no delete or crawl again action for a running crawl', async () => {
      await renderPage({ canCreateWorkflows: false });

      const row = await findRow(runningCrawl.url);

      expect(within(row).queryByTestId(DELETE)).not.toBeInTheDocument();
      expect(within(row).queryByTestId(CRAWL_AGAIN)).not.toBeInTheDocument();
    });

    it("shows the server's message when the crawl cannot be deleted", async () => {
      await renderPage({ canCreateWorkflows: false });
      http.delete.mockRejectedValue(createHttpError('A running crawl cannot be deleted', 409));

      fireEvent.click(await findRowAction(completedCrawl.url, DELETE));

      expect(await screen.findByTestId(ERROR_CALLOUT)).toHaveTextContent(
        'A running crawl cannot be deleted'
      );
      expect(await findRow(completedCrawl.url)).toBeInTheDocument();
    });

    it('replaces the error of an earlier action with the outcome of the latest one', async () => {
      await renderPage({ canCreateWorkflows: false });
      http.post.mockRejectedValue(createHttpError('Stop failed'));
      http.delete.mockRejectedValueOnce(createHttpError('Delete failed'));
      http.delete.mockResolvedValue(undefined);

      fireEvent.click(await findRowAction(runningCrawl.url, STOP));
      expect(await screen.findByTestId(ERROR_CALLOUT)).toHaveTextContent('Stop failed');

      fireEvent.click(await findRowAction(completedCrawl.url, DELETE));
      await waitFor(() =>
        expect(screen.getByTestId(ERROR_CALLOUT)).toHaveTextContent('Delete failed')
      );

      fireEvent.click(await findRowAction(completedCrawl.url, DELETE));
      await waitFor(() => expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument());
    });
  });

  describe('crawling again', () => {
    it("starts a crawl with the earlier crawl's URL and limits", async () => {
      await renderPage({ canCreateWorkflows: false });
      const restartedCrawl = { ...completedCrawl, id: 'running-3', status: 'running' as const };
      http.post.mockImplementation(async () => {
        crawls = [restartedCrawl, runningCrawl];
        return restartedCrawl;
      });

      fireEvent.click(await findRowAction(completedCrawl.url, CRAWL_AGAIN));

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://completed.example/docs',
          maxDepth: 4,
          maxDocuments: 120,
          includePaths: [],
          excludePaths: [],
          indexName: 'web-crawl-completed-example',
          seedUrls: [],
          sitemapUrls: [],
        }),
      });
      await waitFor(async () =>
        expect(await findRow(completedCrawl.url)).toHaveTextContent('Running')
      );
    });

    it("starts a crawl with the earlier crawl's paths", async () => {
      crawls = [
        runningCrawl,
        { ...completedCrawl, includePaths: ['/docs', '/blog'], excludePaths: ['/docs/archive'] },
      ];
      await renderPage({ canCreateWorkflows: false });
      http.post.mockResolvedValue({ ...completedCrawl, id: 'running-3', status: 'running' });

      fireEvent.click(await findRowAction(completedCrawl.url, CRAWL_AGAIN));

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://completed.example/docs',
          maxDepth: 4,
          maxDocuments: 120,
          includePaths: ['/docs', '/blog'],
          excludePaths: ['/docs/archive'],
          indexName: 'web-crawl-completed-example',
          seedUrls: [],
          sitemapUrls: [],
        }),
      });
    });

    it("ignores the paths in the form and uses the earlier crawl's", async () => {
      crawls = [runningCrawl, { ...completedCrawl, excludePaths: ['/tags'] }];
      await renderPage({ canCreateWorkflows: false });
      http.post.mockResolvedValue({ ...completedCrawl, id: 'running-3', status: 'running' });
      fireEvent.change(screen.getByTestId('webCrawlIncludePaths'), {
        target: { value: 'not-a-path' },
      });

      fireEvent.click(await findRowAction(completedCrawl.url, CRAWL_AGAIN));

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://completed.example/docs',
          maxDepth: 4,
          maxDocuments: 120,
          includePaths: [],
          excludePaths: ['/tags'],
          indexName: 'web-crawl-completed-example',
          seedUrls: [],
          sitemapUrls: [],
        }),
      });
    });

    it("starts a crawl with the earlier crawl's index, start URLs and sitemap URLs", async () => {
      crawls = [
        runningCrawl,
        {
          ...completedCrawl,
          indexName: 'docs',
          seedUrls: ['https://completed.example/blog', 'https://docs.completed.example/x,y'],
          sitemapUrls: ['https://completed.example/sitemap-docs.xml'],
        },
      ];
      await renderPage({ canCreateWorkflows: false });
      http.post.mockResolvedValue({ ...completedCrawl, id: 'running-3', status: 'running' });

      fireEvent.click(await findRowAction(completedCrawl.url, CRAWL_AGAIN));

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://completed.example/docs',
          maxDepth: 4,
          maxDocuments: 120,
          includePaths: [],
          excludePaths: [],
          indexName: 'docs',
          seedUrls: ['https://completed.example/blog', 'https://docs.completed.example/x,y'],
          sitemapUrls: ['https://completed.example/sitemap-docs.xml'],
        }),
      });
    });

    it("ignores the targets in the form and uses the earlier crawl's", async () => {
      crawls = [
        runningCrawl,
        { ...completedCrawl, sitemapUrls: ['https://completed.example/sitemap-docs.xml'] },
      ];
      await renderPage({ canCreateWorkflows: false });
      http.post.mockResolvedValue({ ...completedCrawl, id: 'running-3', status: 'running' });
      fireEvent.change(screen.getByTestId('webCrawlIndexName'), {
        target: { value: 'Not An Index' },
      });
      fireEvent.change(screen.getByTestId('webCrawlSeedUrls'), {
        target: { value: 'https://other.example' },
      });
      fireEvent.change(screen.getByTestId('webCrawlSitemapUrls'), {
        target: { value: 'not-a-url' },
      });

      fireEvent.click(await findRowAction(completedCrawl.url, CRAWL_AGAIN));

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      expect(http.post).toHaveBeenCalledWith(WEB_CRAWLS_PATH, {
        body: JSON.stringify({
          url: 'https://completed.example/docs',
          maxDepth: 4,
          maxDocuments: 120,
          includePaths: [],
          excludePaths: [],
          indexName: 'web-crawl-completed-example',
          seedUrls: [],
          sitemapUrls: ['https://completed.example/sitemap-docs.xml'],
        }),
      });
    });

    it("shows the server's refusal when the site cannot be crawled again", async () => {
      await renderPage({ canCreateWorkflows: false });
      http.post.mockRejectedValue(createHttpError('completed.example is already being crawled'));

      fireEvent.click(await findRowAction(completedCrawl.url, CRAWL_AGAIN));

      expect(
        await screen.findByText('completed.example is already being crawled')
      ).toBeInTheDocument();
    });
  });

  describe('scheduling a crawl', () => {
    const scheduleRequest = {
      url: 'https://completed.example/docs',
      maxDepth: 4,
      maxDocuments: 120,
      indexName: 'web-crawl-completed-example',
      every: 2,
      unit: 'h' as const,
    };

    const openScheduleModal = async () => {
      fireEvent.click(await findRowAction(completedCrawl.url, SCHEDULE));
      return screen.findByTestId(SCHEDULE_MODAL);
    };

    const confirmEveryTwoHours = () => {
      fireEvent.change(screen.getByTestId('webCrawlScheduleEvery'), {
        target: { value: '2' },
      });
      fireEvent.change(screen.getByTestId('webCrawlScheduleUnit'), {
        target: { value: 'h' },
      });
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    };

    it.each<[string, RenderOptions]>([
      ['cannot create workflows', { canCreateWorkflows: false }],
      ['cannot read workflows', { canReadWorkflows: false }],
      ['has no Workflows app', { hasWorkflowsApp: false }],
    ])('offers no schedule action when the user %s', async (_, options) => {
      await renderPage(options);

      const runningRow = await findRow(runningCrawl.url);
      const completedRow = await findRow(completedCrawl.url);

      expect(within(runningRow).queryByTestId(SCHEDULE)).not.toBeInTheDocument();
      expect(within(completedRow).queryByTestId(SCHEDULE)).not.toBeInTheDocument();
      expect(
        within(completedRow).queryByTestId('euiCollapsedItemActionsButton')
      ).not.toBeInTheDocument();
    });

    it.each<[string, RenderOptions]>([
      ['cannot create workflows', { canCreateWorkflows: false }],
      ['cannot read workflows', { canReadWorkflows: false }],
      ['has no Workflows app', { hasWorkflowsApp: false }],
    ])('offers no way to schedule a new crawl when the user %s', async (_, options) => {
      await renderPage(options);
      await findRow(completedCrawl.url);

      expect(screen.queryByTestId('webCrawlsNewSchedule')).not.toBeInTheDocument();
    });

    it('schedules a crawl of a site that was never crawled', async () => {
      await renderPage();
      const created = { id: 'workflow-2', name: 'Web crawl: new.example', enabled: true };
      http.post.mockImplementation(async () => {
        workflows = [created];
        return created;
      });

      fireEvent.click(await screen.findByTestId('webCrawlsNewSchedule'));
      await screen.findByTestId(SCHEDULE_MODAL);
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();
      fireEvent.change(screen.getByTestId('webCrawlScheduleUrl'), {
        target: { value: ' https://new.example/docs ' },
      });
      fireEvent.change(screen.getByTestId('webCrawlScheduleMaxDepth'), { target: { value: '3' } });
      fireEvent.change(screen.getByTestId('webCrawlScheduleMaxDocuments'), {
        target: { value: '50' },
      });
      confirmEveryTwoHours();

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({
          yaml: buildWebCrawlWorkflowYaml({
            url: 'https://new.example/docs',
            maxDepth: 3,
            maxDocuments: 50,
            every: 2,
            unit: 'h',
          }),
        }),
        version: API_VERSION,
      });
      expect(await screen.findByRole('link', { name: 'Web crawl: new.example' })).toHaveAttribute(
        'href',
        '/app/workflows/workflow-2'
      );
    });

    it('schedules a crawl of a site that was never crawled with the paths the user entered', async () => {
      await renderPage();
      http.post.mockResolvedValue({ id: 'workflow-2', name: 'Web crawl', enabled: true });
      const request = {
        url: 'https://new.example',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: ['/docs', '/blog'],
        excludePaths: ['/docs/archive'],
        every: 2,
        unit: 'h' as const,
      };

      fireEvent.click(await screen.findByTestId('webCrawlsNewSchedule'));
      await screen.findByTestId(SCHEDULE_MODAL);
      fireEvent.change(screen.getByTestId('webCrawlScheduleUrl'), {
        target: { value: 'https://new.example' },
      });
      // The crawl form behind the modal has path inputs of its own.
      const modal = within(screen.getByTestId(SCHEDULE_MODAL));
      fireEvent.change(modal.getByTestId('webCrawlIncludePaths'), {
        target: { value: '/docs, /blog, /docs' },
      });
      fireEvent.change(modal.getByTestId('webCrawlExcludePaths'), {
        target: { value: '/docs/archive' },
      });
      confirmEveryTwoHours();

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      const yaml = buildWebCrawlWorkflowYaml(request);
      expect(yaml).toContain('include_paths');
      expect(yaml).toContain('exclude_paths');
      expect(yaml).toContain('/docs/archive');
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml }),
        version: API_VERSION,
      });
    });

    it('cannot schedule a new crawl while its paths are invalid', async () => {
      await renderPage();

      fireEvent.click(await screen.findByTestId('webCrawlsNewSchedule'));
      await screen.findByTestId(SCHEDULE_MODAL);
      fireEvent.change(screen.getByTestId('webCrawlScheduleUrl'), {
        target: { value: 'https://new.example' },
      });
      const modal = within(screen.getByTestId(SCHEDULE_MODAL));
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();

      fireEvent.change(modal.getByTestId('webCrawlIncludePaths'), { target: { value: 'docs' } });

      expect(modal.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(http.post).not.toHaveBeenCalled();
      expect(screen.getByTestId(SCHEDULE_MODAL)).toBeInTheDocument();
    });

    it("creates a workflow that repeats the crawl's paths", async () => {
      crawls = [
        runningCrawl,
        { ...completedCrawl, includePaths: ['/docs'], excludePaths: ['/docs/archive', '/tags'] },
      ];
      await renderPage();
      http.post.mockResolvedValue({ id: 'workflow-1', name: 'Web crawl', enabled: true });
      const modal = await openScheduleModal();
      expect(modal).toHaveTextContent('into the same index and with the same options');
      expect(within(modal).queryByTestId('webCrawlIncludePaths')).not.toBeInTheDocument();

      confirmEveryTwoHours();

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      const yaml = buildWebCrawlWorkflowYaml({
        ...scheduleRequest,
        includePaths: ['/docs'],
        excludePaths: ['/docs/archive', '/tags'],
      });
      expect(yaml).not.toBe(buildWebCrawlWorkflowYaml(scheduleRequest));
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml }),
        version: API_VERSION,
      });
    });

    it("creates a workflow that repeats the crawl's index, start URLs and sitemap URLs", async () => {
      const targets = {
        indexName: 'docs',
        seedUrls: ['https://completed.example/blog', 'https://docs.completed.example'],
        sitemapUrls: ['https://completed.example/sitemap-docs.xml'],
      };
      crawls = [runningCrawl, { ...completedCrawl, ...targets }];
      await renderPage();
      http.post.mockResolvedValue({ id: 'workflow-1', name: 'Web crawl', enabled: true });
      const modal = await openScheduleModal();
      expect(within(modal).queryByTestId('webCrawlTargets')).not.toBeInTheDocument();

      confirmEveryTwoHours();

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      const yaml = buildWebCrawlWorkflowYaml({ ...scheduleRequest, ...targets });
      expect(yaml).toContain('index_name: docs');
      expect(yaml).toMatch(
        /seed_urls:\s*\n\s*- https:\/\/completed\.example\/blog\s*\n\s*- https:\/\/docs\.completed\.example\s*\n/
      );
      expect(yaml).toMatch(
        /sitemap_urls:\s*\n\s*- https:\/\/completed\.example\/sitemap-docs\.xml\s*\n/
      );
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml }),
        version: API_VERSION,
      });
    });

    it("creates a workflow that crawls into the crawl's index, without URL lists it did not have", async () => {
      await renderPage();
      http.post.mockResolvedValue({ id: 'workflow-1', name: 'Web crawl', enabled: true });
      await openScheduleModal();

      confirmEveryTwoHours();

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      const yaml = buildWebCrawlWorkflowYaml(scheduleRequest);
      expect(yaml).toContain('index_name: web-crawl-completed-example');
      expect(yaml).not.toContain('seed_urls');
      expect(yaml).not.toContain('sitemap_urls');
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml }),
        version: API_VERSION,
      });
    });

    it('schedules a crawl of a site that was never crawled with the targets the user entered', async () => {
      await renderPage();
      http.post.mockResolvedValue({ id: 'workflow-2', name: 'Web crawl', enabled: true });
      const request = {
        url: 'https://new.example',
        maxDepth: 2,
        maxDocuments: 500,
        indexName: 'docs',
        seedUrls: ['https://new.example/blog', 'https://docs.new.example'],
        sitemapUrls: ['https://new.example/sitemap-docs.xml'],
        every: 2,
        unit: 'h' as const,
      };

      fireEvent.click(await screen.findByTestId('webCrawlsNewSchedule'));
      await screen.findByTestId(SCHEDULE_MODAL);
      fireEvent.change(screen.getByTestId('webCrawlScheduleUrl'), {
        target: { value: 'https://new.example' },
      });
      // The crawl form behind the modal has target inputs of its own.
      const modal = within(screen.getByTestId(SCHEDULE_MODAL));
      fireEvent.click(modal.getByText('Index, start URLs and sitemaps'));
      fireEvent.change(modal.getByTestId('webCrawlIndexName'), { target: { value: ' docs ' } });
      fireEvent.change(modal.getByTestId('webCrawlSeedUrls'), {
        target: {
          value: 'https://new.example/blog,https://docs.new.example  https://new.example/blog',
        },
      });
      fireEvent.change(modal.getByTestId('webCrawlSitemapUrls'), {
        target: { value: 'https://new.example/sitemap-docs.xml' },
      });
      confirmEveryTwoHours();

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      const yaml = buildWebCrawlWorkflowYaml(request);
      expect(yaml).toContain('index_name: docs');
      expect(yaml).toContain('seed_urls');
      expect(yaml).toContain('sitemap_urls');
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml }),
        version: API_VERSION,
      });
    });

    it('schedules a crawl of a site that was never crawled into the default index when none is named', async () => {
      await renderPage();
      http.post.mockResolvedValue({ id: 'workflow-2', name: 'Web crawl', enabled: true });

      fireEvent.click(await screen.findByTestId('webCrawlsNewSchedule'));
      await screen.findByTestId(SCHEDULE_MODAL);
      fireEvent.change(screen.getByTestId('webCrawlScheduleUrl'), {
        target: { value: 'https://new.example' },
      });
      confirmEveryTwoHours();

      await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
      for (const key of ['index_name', 'seed_urls', 'sitemap_urls']) {
        expect(http.post).toHaveBeenCalledWith(
          WORKFLOW_PATH,
          expect.objectContaining({ body: expect.not.stringContaining(key) })
        );
      }
    });

    it.each([
      ['webCrawlIndexName', 'Docs', INVALID_INDEX_NAME_MESSAGE],
      ['webCrawlSeedUrls', 'docs.new.example', INVALID_URLS_MESSAGE],
      ['webCrawlSitemapUrls', '/sitemap.xml', INVALID_URLS_MESSAGE],
    ])(
      'cannot schedule a new crawl while its %s is set to %p',
      async (testSubj, value, message) => {
        await renderPage();

        fireEvent.click(await screen.findByTestId('webCrawlsNewSchedule'));
        await screen.findByTestId(SCHEDULE_MODAL);
        fireEvent.change(screen.getByTestId('webCrawlScheduleUrl'), {
          target: { value: 'https://new.example' },
        });
        const modal = within(screen.getByTestId(SCHEDULE_MODAL));
        fireEvent.click(modal.getByText('Index, start URLs and sitemaps'));
        expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();

        fireEvent.change(modal.getByTestId(testSubj), { target: { value } });

        expect(modal.getByText(message)).toBeVisible();
        expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();

        fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

        expect(http.post).not.toHaveBeenCalled();
        expect(screen.getByTestId(SCHEDULE_MODAL)).toBeInTheDocument();
      }
    );

    it('does not carry invalid targets of the crawl form into a new schedule', async () => {
      await renderPage();
      http.post.mockResolvedValue({ id: 'workflow-2', name: 'Web crawl', enabled: true });
      fireEvent.change(screen.getByTestId('webCrawlIndexName'), { target: { value: 'Docs' } });

      fireEvent.click(await screen.findByTestId('webCrawlsNewSchedule'));
      await screen.findByTestId(SCHEDULE_MODAL);
      const modal = within(screen.getByTestId(SCHEDULE_MODAL));
      fireEvent.change(screen.getByTestId('webCrawlScheduleUrl'), {
        target: { value: 'https://new.example' },
      });

      expect(modal.getByTestId('webCrawlIndexName')).toHaveValue('');
      expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
    });

    it('offers the schedule action for running and finished crawls alike', async () => {
      await renderPage();

      expect(await findRowAction(runningCrawl.url, SCHEDULE)).toBeInTheDocument();
      expect(await findRowAction(completedCrawl.url, SCHEDULE)).toBeInTheDocument();
    });

    it('opens the schedule modal for the crawl of the row', async () => {
      await renderPage();

      const modal = await openScheduleModal();

      expect(modal).toHaveTextContent('crawls https://completed.example/docs again');
      expect(http.post).not.toHaveBeenCalled();
    });

    it('creates the workflow, closes the modal and lists the new schedule', async () => {
      await renderPage();
      const created = { id: 'workflow-1', name: 'Web crawl: completed', enabled: true };
      http.post.mockImplementation(async () => {
        workflows = [created];
        return created;
      });
      await openScheduleModal();

      confirmEveryTwoHours();

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(WORKFLOW_PATH, {
        body: JSON.stringify({ yaml: buildWebCrawlWorkflowYaml(scheduleRequest) }),
        version: API_VERSION,
      });
      expect(await screen.findByRole('link', { name: 'Web crawl: completed' })).toHaveAttribute(
        'href',
        '/app/workflows/workflow-1'
      );
    });

    it("keeps the modal open with the server's error when the workflow cannot be created", async () => {
      await renderPage();
      http.post.mockRejectedValue(createHttpError('Invalid workflow yaml'));
      const modal = await openScheduleModal();

      confirmEveryTwoHours();

      expect(await within(modal).findByText('Invalid workflow yaml')).toBeInTheDocument();
      expect(screen.getByTestId(SCHEDULE_MODAL)).toBeInTheDocument();
      expect(screen.queryByTestId(ERROR_CALLOUT)).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled());
    });

    it('closes without creating anything when canceled', async () => {
      await renderPage();
      await openScheduleModal();

      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      expect(http.post).not.toHaveBeenCalled();
    });

    it('forgets a creation error once the modal was canceled', async () => {
      await renderPage();
      http.post.mockRejectedValue(createHttpError('Invalid workflow yaml'));
      const modal = await openScheduleModal();
      confirmEveryTwoHours();
      expect(await within(modal).findByText('Invalid workflow yaml')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());

      const reopenedModal = await openScheduleModal();

      expect(within(reopenedModal).queryByText('Invalid workflow yaml')).not.toBeInTheDocument();
      expect(screen.getByTestId('webCrawlScheduleEvery')).toHaveValue(1);
      expect(screen.getByTestId('webCrawlScheduleUnit')).toHaveValue('d');
    });

    it('creates the workflow on a retry after a failure', async () => {
      await renderPage();
      http.post.mockRejectedValueOnce(createHttpError('Invalid workflow yaml'));
      http.post.mockResolvedValue({ id: 'workflow-1', name: 'Web crawl', enabled: true });
      const modal = await openScheduleModal();
      confirmEveryTwoHours();
      expect(await within(modal).findByText('Invalid workflow yaml')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled());

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => expect(screen.queryByTestId(SCHEDULE_MODAL)).not.toBeInTheDocument());
      expect(http.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('schedules section', () => {
    it.each<[string, RenderOptions]>([
      ['cannot read workflows', { canReadWorkflows: false }],
      ['has no Workflows app', { hasWorkflowsApp: false }],
    ])('is hidden, and requests no workflows, when the user %s', async (_, options) => {
      workflows = [{ id: 'workflow-1', name: 'Web crawl: example', enabled: true }];
      await renderPage(options);

      await findRow(completedCrawl.url);
      expect(screen.queryByRole('heading', { name: 'Schedules' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlsSchedules')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlsNoSchedules')).not.toBeInTheDocument();
      expect(getWorkflowsRequests()).toHaveLength(0);
    });

    it('is shown to a user who can read but not create workflows', async () => {
      workflows = [{ id: 'workflow-1', name: 'Web crawl: example', enabled: true }];
      await renderPage({ canCreateWorkflows: false });

      expect(await screen.findByTestId('webCrawlsSchedules')).toBeInTheDocument();
    });

    it('explains how to schedule a crawl when there are no schedules', async () => {
      await renderPage();

      await waitFor(() => expect(getWorkflowsRequests()).toHaveLength(1));
      expect(screen.getByRole('heading', { name: 'Schedules' })).toBeInTheDocument();
      expect(screen.getByTestId('webCrawlsNoSchedules')).toHaveTextContent(
        'No recurring crawls. Schedule one here, or use the schedule action of a crawl to repeat it.'
      );
      expect(screen.queryByTestId('webCrawlsSchedules')).not.toBeInTheDocument();
    });

    it('requests the workflows tagged as web crawls', async () => {
      await renderPage();

      await waitFor(() =>
        expect(http.get).toHaveBeenCalledWith(WORKFLOWS_PATH, {
          query: { tags: 'web-crawl', size: 100 },
          version: API_VERSION,
        })
      );
    });

    it('links every schedule to its workflow and shows whether it is enabled', async () => {
      workflows = [
        { id: 'workflow-1', name: 'Web crawl: https://example.com', enabled: true },
        { id: 'workflow/2', name: 'Web crawl: https://elastic.co', enabled: false },
      ];
      await renderPage();

      const list = await screen.findByTestId('webCrawlsSchedules');
      const items = within(list).getAllByRole('listitem');

      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('Enabled');
      expect(items[1]).toHaveTextContent('Disabled');

      const enabledLink = within(items[0]).getByRole('link', {
        name: 'Web crawl: https://example.com',
      });
      expect(enabledLink).toHaveAttribute('href', '/app/workflows/workflow-1');
      expect(enabledLink).toHaveAttribute(
        'data-telemetry-id',
        'testHost-home-webCrawls-openWorkflow'
      );
      expect(
        within(items[1]).getByRole('link', { name: 'Web crawl: https://elastic.co' })
      ).toHaveAttribute('href', '/app/workflows/workflow%2F2');
      expect(application.getUrlForApp).toHaveBeenCalledWith('workflows', { path: '/workflow-1' });
      expect(application.getUrlForApp).toHaveBeenCalledWith('workflows', {
        path: '/workflow%2F2',
      });
      expect(screen.queryByTestId('webCrawlsNoSchedules')).not.toBeInTheDocument();
    });

    it('links a crawl a workflow started to that workflow', async () => {
      crawls = [{ ...completedCrawl, workflowId: 'workflow-1', startedBy: 'elastic' }];
      await renderPage();

      const row = await findRow(completedCrawl.url);

      expect(within(row).getByRole('link', { name: 'Workflow' })).toHaveAttribute(
        'href',
        '/app/workflows/workflow-1'
      );
    });
  });
});
