/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import type { WebCrawl } from '../../common/types';
import { createWebCrawl, renderWithWebCrawlerContext } from '../test_utils';
import type { WebCrawlsTableProps } from './web_crawls_table';
import { WebCrawlsTable } from './web_crawls_table';

const STOP = 'webCrawlsStop';
const CRAWL_AGAIN = 'webCrawlsCrawlAgain';
const SCHEDULE = 'webCrawlsSchedule';
const DELETE = 'webCrawlsDelete';
const MORE_START_URLS = 'webCrawlsMoreStartUrls';

const runningCrawl = createWebCrawl({ id: 'running-1' });
const completedCrawl = createWebCrawl({
  id: 'completed-1',
  status: 'completed',
  finishedAt: '2026-01-01T00:00:45.000Z',
});

describe('WebCrawlsTable', () => {
  const onStop = jest.fn();
  const onCrawlAgain = jest.fn();
  const onSchedule = jest.fn();
  const onDelete = jest.fn();
  const getIndexUrl = jest.fn();
  const getWorkflowUrl = jest.fn();

  const renderTable = (crawls: WebCrawl[], props: Partial<WebCrawlsTableProps> = {}) =>
    renderWithWebCrawlerContext(
      <WebCrawlsTable
        crawls={crawls}
        isLoading={false}
        canSchedule={false}
        isActing={false}
        getIndexUrl={getIndexUrl}
        getWorkflowUrl={getWorkflowUrl}
        onStop={onStop}
        onCrawlAgain={onCrawlAgain}
        onSchedule={onSchedule}
        onDelete={onDelete}
        {...props}
      />
    );

  const getRows = () => screen.getAllByRole('row').slice(1);

  // A row with more than two actions collapses them into a menu.
  const openActionsMenu = () => {
    const toggle = screen.queryByTestId('euiCollapsedItemActionsButton');
    if (toggle) {
      fireEvent.click(toggle);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getIndexUrl.mockImplementation((indexName: string) => `/app/indices/${indexName}`);
    getWorkflowUrl.mockImplementation((workflowId: string) => `/app/workflows/${workflowId}`);
  });

  describe('contents', () => {
    it('tells the user how to start when there are no crawls', () => {
      renderTable([]);

      expect(screen.getByTestId('webCrawlsTable')).toHaveTextContent(
        'No crawls yet. Enter a URL above to start one.'
      );
    });

    it('is captioned for assistive technology', async () => {
      renderTable([completedCrawl]);

      const caption = await screen.findByText(/Running and past web crawls/, {
        selector: 'caption *',
      });

      expect(screen.getByRole('table')).toContainElement(caption);
    });

    it('lists the most recently started crawl first', () => {
      renderTable([
        createWebCrawl({
          id: 'a',
          url: 'https://oldest.example',
          startedAt: '2026-01-01T00:00:00Z',
        }),
        createWebCrawl({
          id: 'b',
          url: 'https://newest.example',
          startedAt: '2026-01-03T00:00:00Z',
        }),
        createWebCrawl({
          id: 'c',
          url: 'https://middle.example',
          startedAt: '2026-01-02T00:00:00Z',
        }),
      ]);

      const rows = getRows();

      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent('https://newest.example');
      expect(rows[1]).toHaveTextContent('https://middle.example');
      expect(rows[2]).toHaveTextContent('https://oldest.example');
    });

    it('links the site in a new tab', () => {
      renderTable([completedCrawl]);

      const link = screen.getByRole('link', { name: /https:\/\/example\.com/ });

      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('mentions no more start URLs for a crawl that started from its URL alone', () => {
      renderTable([completedCrawl]);

      expect(screen.queryByTestId(MORE_START_URLS)).not.toBeInTheDocument();
      expect(screen.getByTestId('webCrawlsTable')).not.toHaveTextContent('more start URL');
    });

    it.each([
      [1, 'and 1 more start URL'],
      [2, 'and 2 more start URLs'],
      [20, 'and 20 more start URLs'],
    ])('tells that a crawl had %i more start URL(s)', (count, text) => {
      const seedUrls = Array.from(
        { length: count },
        (_, index) => `https://docs.example.com/p${index}`
      );
      renderTable([{ ...completedCrawl, seedUrls }]);

      expect(screen.getByTestId(MORE_START_URLS).textContent).toBe(text);
    });

    it.each(['running', 'completed', 'failed', 'canceled'] as const)(
      'tells the number of start URLs of a %s crawl',
      (status) => {
        renderTable([createWebCrawl({ status, seedUrls: ['https://docs.example.com'] })]);

        expect(screen.getByTestId(MORE_START_URLS)).toHaveTextContent('and 1 more start URL');
      }
    );

    it('still links the URL of a crawl with more start URLs, and none of the others', () => {
      renderTable([
        { ...completedCrawl, seedUrls: ['https://docs.example.com', 'https://blog.example.com'] },
      ]);

      const row = within(getRows()[0]);

      expect(row.getByRole('link', { name: /https:\/\/example\.com/ })).toHaveAttribute(
        'href',
        'https://example.com'
      );
      expect(row.queryByRole('link', { name: /docs\.example\.com/ })).not.toBeInTheDocument();
      expect(row.queryByText(/blog\.example\.com/)).not.toBeInTheDocument();
    });

    it('mentions more start URLs only in the rows of the crawls that had them', () => {
      renderTable([
        createWebCrawl({
          id: 'a',
          url: 'https://several.example',
          startedAt: '2026-01-03T00:00:00Z',
          seedUrls: ['https://docs.example.com', 'https://blog.example.com'],
        }),
        createWebCrawl({
          id: 'b',
          url: 'https://single.example',
          startedAt: '2026-01-02T00:00:00Z',
        }),
        createWebCrawl({
          id: 'c',
          url: 'https://one-more.example',
          startedAt: '2026-01-01T00:00:00Z',
          seedUrls: ['https://docs.example.com'],
        }),
      ]);

      const rows = getRows();

      expect(within(rows[0]).getByTestId(MORE_START_URLS)).toHaveTextContent(
        'and 2 more start URLs'
      );
      expect(within(rows[1]).queryByTestId(MORE_START_URLS)).not.toBeInTheDocument();
      expect(within(rows[2]).getByTestId(MORE_START_URLS).textContent).toBe('and 1 more start URL');
    });

    it('does not count sitemap URLs as start URLs', () => {
      renderTable([
        {
          ...completedCrawl,
          sitemapUrls: ['https://example.com/sitemap-docs.xml', 'https://example.com/sitemap.xml'],
        },
      ]);

      expect(screen.queryByTestId(MORE_START_URLS)).not.toBeInTheDocument();
    });

    it('links the index to its details', () => {
      renderTable([completedCrawl]);

      expect(screen.getByRole('link', { name: 'web-crawl-example-com' })).toHaveAttribute(
        'href',
        '/app/indices/web-crawl-example-com'
      );
      expect(getIndexUrl).toHaveBeenCalledWith('web-crawl-example-com');
    });

    it('shows the index name without a link when its details cannot be linked', () => {
      getIndexUrl.mockReturnValue(undefined);
      renderTable([completedCrawl]);

      expect(screen.getByText('web-crawl-example-com')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'web-crawl-example-com' })).not.toBeInTheDocument();
    });

    it.each([
      ['running', 'Running'],
      ['completed', 'Completed'],
      ['failed', 'Failed'],
      ['canceled', 'Stopped'],
    ] as const)('labels a %s crawl %p', (status, label) => {
      renderTable([createWebCrawl({ status })]);

      expect(within(getRows()[0]).getByText(label)).toBeInTheDocument();
    });

    it('labels a running crawl that was asked to stop as stopping', () => {
      renderTable([createWebCrawl({ isStopping: true })]);

      const row = within(getRows()[0]);
      expect(row.getByText('Stopping')).toBeInTheDocument();
      expect(row.queryByText('Running')).not.toBeInTheDocument();
    });

    it('explains a failure in a tooltip on its keyboard-focusable status', async () => {
      renderTable([createWebCrawl({ status: 'failed', error: 'Reader quota exceeded' })]);

      const badge = within(getRows()[0]).getByText('Failed').closest('.euiBadge');
      expect(badge).toHaveAttribute('tabindex', '0');

      fireEvent.mouseOver(badge as Element);

      expect(await screen.findByText('Reader quota exceeded')).toBeInTheDocument();
    });

    it('keeps a status without an error out of the tab order', () => {
      renderTable([completedCrawl]);

      expect(within(getRows()[0]).getByText('Completed').closest('.euiBadge')).not.toHaveAttribute(
        'tabindex'
      );
    });

    it('breaks the pages of a running crawl down into indexed, in progress and queued', () => {
      renderTable([
        createWebCrawl({ documentsCount: 3, failedCount: 1, requestedCount: 6, queuedCount: 4 }),
      ]);

      expect(getRows()[0]).toHaveTextContent('3 indexed, 2 in progress, 4 queued');
    });

    it('never reports a negative number of pages in progress', () => {
      renderTable([
        createWebCrawl({ documentsCount: 5, failedCount: 2, requestedCount: 6, queuedCount: 0 }),
      ]);

      expect(getRows()[0]).toHaveTextContent('5 indexed, 0 in progress, 0 queued');
    });

    it('reports the pages of a finished crawl against its limit', () => {
      renderTable([createWebCrawl({ status: 'completed', documentsCount: 37, maxDocuments: 500 })]);

      const row = getRows()[0];
      expect(row).toHaveTextContent('37 of at most 500 indexed');
      expect(row).not.toHaveTextContent('failed');
    });

    it('adds the failed pages of a finished crawl when there are any', () => {
      renderTable([
        createWebCrawl({ status: 'canceled', documentsCount: 8, maxDocuments: 20, failedCount: 2 }),
      ]);

      expect(getRows()[0]).toHaveTextContent('8 of at most 20 indexed, 2 failed');
    });

    it('adds the removed pages of a finished crawl when there are any', () => {
      renderTable([
        createWebCrawl({
          status: 'completed',
          documentsCount: 8,
          maxDocuments: 20,
          purgedCount: 3,
        }),
      ]);

      const row = getRows()[0];
      expect(row).toHaveTextContent('8 of at most 20 indexed, 3 removed');
      expect(row).not.toHaveTextContent('failed');
    });

    it('lists the failed pages of a finished crawl before the removed ones', () => {
      renderTable([
        createWebCrawl({
          status: 'failed',
          documentsCount: 8,
          maxDocuments: 20,
          failedCount: 2,
          purgedCount: 1,
        }),
      ]);

      expect(getRows()[0]).toHaveTextContent('8 of at most 20 indexed, 2 failed, 1 removed');
    });

    it('mentions no removed pages when a finished crawl removed none', () => {
      renderTable([createWebCrawl({ status: 'completed', documentsCount: 8, purgedCount: 0 })]);

      expect(getRows()[0]).not.toHaveTextContent('removed');
    });

    it('mentions no removed pages while a crawl is running', () => {
      renderTable([createWebCrawl({ documentsCount: 3, requestedCount: 3, purgedCount: 2 })]);

      const row = getRows()[0];
      expect(row).toHaveTextContent('3 indexed, 0 in progress, 0 queued');
      expect(row).not.toHaveTextContent('removed');
    });

    it.each(['completed', 'failed', 'canceled'] as const)(
      'tells that a %s crawl reached its page limit',
      (status) => {
        renderTable([
          createWebCrawl({ status, documentsCount: 18, requestedCount: 20, maxDocuments: 20 }),
        ]);

        expect(within(getRows()[0]).getByTestId('webCrawlsPageLimitReached')).toHaveTextContent(
          'Page limit reached'
        );
      }
    );

    it('tells that a finished crawl that requested more pages than its limit reached it', () => {
      renderTable([createWebCrawl({ status: 'completed', requestedCount: 21, maxDocuments: 20 })]);

      expect(screen.getByTestId('webCrawlsPageLimitReached')).toBeInTheDocument();
    });

    it('does not mention the page limit of a finished crawl that stayed one page under it', () => {
      renderTable([
        createWebCrawl({
          status: 'completed',
          documentsCount: 19,
          requestedCount: 19,
          maxDocuments: 20,
        }),
      ]);

      expect(screen.queryByTestId('webCrawlsPageLimitReached')).not.toBeInTheDocument();
      expect(getRows()[0]).not.toHaveTextContent('Page limit reached');
    });

    it('does not mention the page limit while a crawl that reached it is still running', () => {
      renderTable([
        createWebCrawl({
          documentsCount: 15,
          requestedCount: 20,
          maxDocuments: 20,
          queuedCount: 0,
        }),
      ]);

      expect(screen.queryByTestId('webCrawlsPageLimitReached')).not.toBeInTheDocument();
    });

    it('mentions the page limit only in the rows of the crawls that reached it', () => {
      renderTable([
        createWebCrawl({
          id: 'limited',
          status: 'completed',
          requestedCount: 20,
          maxDocuments: 20,
          startedAt: '2026-01-02T00:00:00.000Z',
        }),
        createWebCrawl({
          id: 'unlimited',
          status: 'completed',
          requestedCount: 5,
          maxDocuments: 20,
          startedAt: '2026-01-01T00:00:00.000Z',
        }),
      ]);

      const rows = getRows();
      expect(within(rows[0]).getByTestId('webCrawlsPageLimitReached')).toBeInTheDocument();
      expect(within(rows[1]).queryByTestId('webCrawlsPageLimitReached')).not.toBeInTheDocument();
    });

    it.each([
      [4, 7, 'Skipped links: 4 by robots.txt, 7 by path rules'],
      [4, 0, 'Skipped links: 4 by robots.txt, 0 by path rules'],
      [0, 1, 'Skipped links: 0 by robots.txt, 1 by path rules'],
    ])(
      'reports %p links skipped by robots.txt and %p by path rules',
      (skippedByRobotsCount, skippedByRulesCount, text) => {
        renderTable([
          createWebCrawl({ status: 'completed', skippedByRobotsCount, skippedByRulesCount }),
        ]);

        expect(within(getRows()[0]).getByTestId('webCrawlsSkipped')).toHaveTextContent(text);
      }
    );

    it('reports the links skipped so far while a crawl is running', () => {
      renderTable([createWebCrawl({ skippedByRobotsCount: 2, skippedByRulesCount: 3 })]);

      expect(screen.getByTestId('webCrawlsSkipped')).toHaveTextContent(
        'Skipped links: 2 by robots.txt, 3 by path rules'
      );
    });

    it.each(['running', 'completed', 'failed', 'canceled'] as const)(
      'mentions no skipped links for a %s crawl that skipped none',
      (status) => {
        renderTable([createWebCrawl({ status })]);

        expect(screen.queryByTestId('webCrawlsSkipped')).not.toBeInTheDocument();
        expect(getRows()[0]).not.toHaveTextContent('Skipped links');
      }
    );

    it('shows the page counts, the page limit and the skipped links of one crawl together', () => {
      renderTable([
        createWebCrawl({
          status: 'completed',
          documentsCount: 18,
          failedCount: 2,
          purgedCount: 5,
          requestedCount: 20,
          maxDocuments: 20,
          skippedByRobotsCount: 1,
          skippedByRulesCount: 9,
        }),
      ]);

      const row = within(getRows()[0]);
      expect(row.getByText(/18 of at most 20 indexed, 2 failed, 5 removed/)).toBeInTheDocument();
      expect(row.getByTestId('webCrawlsPageLimitReached')).toHaveTextContent('Page limit reached');
      expect(row.getByTestId('webCrawlsSkipped')).toHaveTextContent(
        'Skipped links: 1 by robots.txt, 9 by path rules'
      );
    });

    it.each([
      ['2026-01-01T00:00:45.000Z', '45s'],
      ['2026-01-01T00:00:59.400Z', '59s'],
      ['2026-01-01T00:01:00.000Z', '1m 0s'],
      ['2026-01-01T00:02:05.000Z', '2m 5s'],
      ['2025-12-31T23:59:00.000Z', '0s'],
    ])('shows a crawl that finished at %s as taking %s', (finishedAt, duration) => {
      renderTable([createWebCrawl({ status: 'completed', finishedAt })]);

      expect(within(getRows()[0]).getByText(duration)).toBeInTheDocument();
    });

    it('shows no duration for a crawl that has not finished', () => {
      renderTable([runningCrawl]);

      expect(getRows()[0]).not.toHaveTextContent(/\d+s\b/);
    });

    it('shows the user who started a crawl', () => {
      renderTable([createWebCrawl({ status: 'completed', startedBy: 'elastic' })]);

      expect(within(getRows()[0]).getByText('elastic')).toBeInTheDocument();
    });

    it('links the workflow that started a crawl instead of its user', () => {
      renderTable([
        createWebCrawl({ status: 'completed', startedBy: 'elastic', workflowId: 'workflow-1' }),
      ]);

      const row = within(getRows()[0]);
      expect(row.getByRole('link', { name: 'Workflow' })).toHaveAttribute(
        'href',
        '/app/workflows/workflow-1'
      );
      expect(getWorkflowUrl).toHaveBeenCalledWith('workflow-1');
      expect(row.queryByText('elastic')).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('offers only stop for a running crawl', () => {
      renderTable([runningCrawl]);

      expect(screen.getByTestId(STOP)).not.toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByTestId(CRAWL_AGAIN)).not.toBeInTheDocument();
      expect(screen.queryByTestId(DELETE)).not.toBeInTheDocument();
      expect(screen.queryByTestId(SCHEDULE)).not.toBeInTheDocument();
      expect(screen.queryByTestId('euiCollapsedItemActionsButton')).not.toBeInTheDocument();
    });

    it('stops the crawl of the row', () => {
      renderTable([runningCrawl]);

      fireEvent.click(screen.getByTestId(STOP));

      expect(onStop).toHaveBeenCalledTimes(1);
      expect(onStop.mock.calls[0][0]).toEqual(runningCrawl);
    });

    it('disables stop while the crawl is already stopping', () => {
      renderTable([createWebCrawl({ isStopping: true })]);

      expect(screen.getByTestId(STOP)).toHaveAttribute('aria-disabled', 'true');

      fireEvent.click(screen.getByTestId(STOP));

      expect(onStop).not.toHaveBeenCalled();
    });

    it('disables stop and delete while another stop or delete is in flight', () => {
      renderTable([createWebCrawl(), createWebCrawl({ id: 'crawl-done', status: 'completed' })], {
        isActing: true,
      });

      expect(screen.getByTestId(STOP)).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByTestId(DELETE)).toHaveAttribute('aria-disabled', 'true');
    });

    it.each(['completed', 'failed', 'canceled'] as const)(
      'offers crawl again and delete, but not stop, for a %s crawl',
      (status) => {
        renderTable([createWebCrawl({ status })]);

        expect(screen.getByTestId(CRAWL_AGAIN)).toBeEnabled();
        expect(screen.getByTestId(DELETE)).toBeEnabled();
        expect(screen.queryByTestId(STOP)).not.toBeInTheDocument();
        expect(screen.queryByTestId(SCHEDULE)).not.toBeInTheDocument();
      }
    );

    it('hands the index, start URLs and sitemap URLs of the row to crawl it again', () => {
      const crawl = {
        ...completedCrawl,
        indexName: 'docs',
        seedUrls: ['https://docs.example.com'],
        sitemapUrls: ['https://example.com/sitemap-docs.xml'],
      };
      renderTable([crawl]);

      openActionsMenu();
      fireEvent.click(screen.getByTestId(CRAWL_AGAIN));

      expect(onCrawlAgain).toHaveBeenCalledTimes(1);
      expect(onCrawlAgain.mock.calls[0][0]).toEqual(crawl);
    });

    it('crawls the site of the row again', () => {
      renderTable([completedCrawl]);

      fireEvent.click(screen.getByTestId(CRAWL_AGAIN));

      expect(onCrawlAgain).toHaveBeenCalledTimes(1);
      expect(onCrawlAgain.mock.calls[0][0]).toEqual(completedCrawl);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('deletes the crawl of the row', () => {
      renderTable([completedCrawl]);

      fireEvent.click(screen.getByTestId(DELETE));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete.mock.calls[0][0]).toEqual(completedCrawl);
      expect(onCrawlAgain).not.toHaveBeenCalled();
    });

    it('names every action for assistive technology', () => {
      renderTable([runningCrawl]);

      expect(screen.getByTestId(STOP)).toHaveAccessibleName(/Stop/);
    });

    describe('when the user can create workflows', () => {
      it('offers schedule next to stop for a running crawl', () => {
        renderTable([runningCrawl], { canSchedule: true });

        expect(screen.getByTestId(STOP)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId(SCHEDULE));

        expect(onSchedule).toHaveBeenCalledTimes(1);
        expect(onSchedule.mock.calls[0][0]).toEqual(runningCrawl);
      });

      it('offers schedule, crawl again and delete for a finished crawl', async () => {
        renderTable([completedCrawl], { canSchedule: true });

        openActionsMenu();

        expect(await screen.findByTestId(SCHEDULE)).toBeInTheDocument();
        expect(screen.getByTestId(CRAWL_AGAIN)).toBeInTheDocument();
        expect(screen.getByTestId(DELETE)).toBeInTheDocument();
        expect(screen.queryByTestId(STOP)).not.toBeInTheDocument();
      });

      it('schedules the crawl of the row', async () => {
        renderTable([completedCrawl], { canSchedule: true });

        openActionsMenu();
        fireEvent.click(await screen.findByTestId(SCHEDULE));

        expect(onSchedule).toHaveBeenCalledTimes(1);
        expect(onSchedule.mock.calls[0][0]).toEqual(completedCrawl);
      });
    });

    it('acts on the crawl of the row that was clicked', () => {
      const olderCrawl = createWebCrawl({
        id: 'completed-0',
        url: 'https://older.example',
        status: 'completed',
        startedAt: '2025-12-01T00:00:00.000Z',
      });
      renderTable([completedCrawl, olderCrawl]);

      fireEvent.click(within(getRows()[1]).getByTestId(DELETE));

      expect(onDelete.mock.calls[0][0]).toEqual(olderCrawl);
    });
  });
});
