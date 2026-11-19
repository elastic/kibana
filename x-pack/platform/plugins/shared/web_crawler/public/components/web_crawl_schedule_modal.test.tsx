/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { WebCrawl } from '../../common/types';
import { createWebCrawl, renderWithWebCrawlerContext } from '../test_utils';
import { INVALID_PATHS_MESSAGE } from './web_crawl_path_rules';
import { WebCrawlScheduleModal } from './web_crawl_schedule_modal';

const INVALID_EVERY_MESSAGE = 'Enter a whole number from 1 to 365.';
const SERVER_ERROR = 'Invalid workflow yaml';
const INVALID_URL_MESSAGE = 'Enter a URL that starts with http:// or https://';
const INVALID_INDEX_NAME_MESSAGE =
  'Start with a lowercase letter or a digit, and use only lowercase letters, digits, dots, hyphens and underscores.';
const INVALID_URLS_MESSAGE = 'Enter up to 20 URLs that start with http:// or https://';

const createUrls = (count: number) =>
  Array.from({ length: count }, (_, index) => `https://example.com/p${index}`);
const createUrlOfLength = (length: number) => {
  const prefix = 'https://example.com/';
  return `${prefix}${'a'.repeat(length - prefix.length)}`;
};

const crawl = createWebCrawl({
  url: 'https://example.com/docs',
  status: 'completed',
  maxDepth: 4,
  maxDocuments: 120,
});

describe('WebCrawlScheduleModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  const renderModal = (
    props: { crawl?: WebCrawl; isCreating?: boolean; errorMessage?: string } = {}
  ) =>
    renderWithWebCrawlerContext(
      <WebCrawlScheduleModal
        crawl={crawl}
        isCreating={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    );

  const getEveryInput = () => screen.getByTestId('webCrawlScheduleEvery');
  const getUnitSelect = () => screen.getByTestId('webCrawlScheduleUnit');
  const getConfirmButton = () => screen.getByTestId('confirmModalConfirmButton');
  const getCancelButton = () => screen.getByTestId('confirmModalCancelButton');
  const setEvery = (value: string) => fireEvent.change(getEveryInput(), { target: { value } });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('describes the crawl it schedules and defaults to every day', () => {
    renderModal();

    expect(
      screen.getByRole('alertdialog', { name: 'Schedule a recurring crawl' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('webCrawlScheduleModal')).toHaveTextContent(
      'Creates a workflow that crawls https://example.com/docs again on this interval, into the same index and with the same options. Change or pause it in Workflows.'
    );
    expect(getEveryInput()).toHaveValue(1);
    expect(getUnitSelect()).toHaveValue('d');
    expect(getConfirmButton()).toBeEnabled();
    expect(getConfirmButton()).toHaveTextContent('Create workflow');
    expect(screen.queryByText(INVALID_EVERY_MESSAGE)).not.toBeInTheDocument();
  });

  it('gives both interval controls an accessible name', () => {
    renderModal();

    expect(screen.getByRole('spinbutton', { name: 'Crawl every' })).toBe(getEveryInput());
    expect(screen.getByRole('combobox', { name: 'Interval unit' })).toBe(getUnitSelect());
  });

  it('offers hours and days as units', () => {
    renderModal();

    const options = Array.from(getUnitSelect().querySelectorAll('option'));

    expect(options.map(({ value, textContent }) => [value, textContent])).toEqual([
      ['h', 'hours'],
      ['d', 'days'],
    ]);
  });

  it("confirms with the crawl's URL and limits and the default interval", () => {
    renderModal();

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      url: 'https://example.com/docs',
      maxDepth: 4,
      maxDocuments: 120,
      includePaths: [],
      excludePaths: [],
      indexName: 'web-crawl-example-com',
      seedUrls: [],
      sitemapUrls: [],
      every: 1,
      unit: 'd',
    });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("confirms with the crawl's paths", () => {
    renderModal({
      crawl: { ...crawl, includePaths: ['/docs', '/blog'], excludePaths: ['/docs/archive'] },
    });

    expect(getConfirmButton()).toBeEnabled();
    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      url: 'https://example.com/docs',
      maxDepth: 4,
      maxDocuments: 120,
      includePaths: ['/docs', '/blog'],
      excludePaths: ['/docs/archive'],
      indexName: 'web-crawl-example-com',
      seedUrls: [],
      sitemapUrls: [],
      every: 1,
      unit: 'd',
    });
  });

  it("carries only the crawl's skip paths when it has no only paths", () => {
    renderModal({ crawl: { ...crawl, excludePaths: ['/tags', '/search'] } });

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ includePaths: [], excludePaths: ['/tags', '/search'] })
    );
  });

  it("carries the crawl's paths along with the interval the user chose", () => {
    renderModal({ crawl: { ...crawl, includePaths: ['/docs'] } });
    setEvery('3');
    fireEvent.change(getUnitSelect(), { target: { value: 'h' } });

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      url: 'https://example.com/docs',
      maxDepth: 4,
      maxDocuments: 120,
      includePaths: ['/docs'],
      excludePaths: [],
      indexName: 'web-crawl-example-com',
      seedUrls: [],
      sitemapUrls: [],
      every: 3,
      unit: 'h',
    });
  });

  it('confirms with the interval and unit the user chose', () => {
    renderModal();
    setEvery('12');
    fireEvent.change(getUnitSelect(), { target: { value: 'h' } });

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      url: 'https://example.com/docs',
      maxDepth: 4,
      maxDocuments: 120,
      includePaths: [],
      excludePaths: [],
      indexName: 'web-crawl-example-com',
      seedUrls: [],
      sitemapUrls: [],
      every: 12,
      unit: 'h',
    });
  });

  it.each(['1', '365'])('accepts the boundary interval %p', (value) => {
    renderModal();

    setEvery(value);

    expect(getEveryInput()).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(INVALID_EVERY_MESSAGE)).not.toBeInTheDocument();

    fireEvent.click(getConfirmButton());

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ every: Number(value) }));
  });

  it.each(['0', '-1', '366', '1.5', ''])(
    'rejects an interval of %p and cannot be confirmed',
    (value) => {
      renderModal();

      setEvery(value);

      expect(screen.getByText(INVALID_EVERY_MESSAGE)).toBeInTheDocument();
      expect(getEveryInput()).toHaveAttribute('aria-invalid', 'true');
      expect(getConfirmButton()).toBeDisabled();

      fireEvent.click(getConfirmButton());

      expect(onConfirm).not.toHaveBeenCalled();
    }
  );

  it('can be confirmed again once an invalid interval is corrected', () => {
    renderModal();
    setEvery('0');
    expect(getConfirmButton()).toBeDisabled();

    setEvery('7');

    expect(screen.queryByText(INVALID_EVERY_MESSAGE)).not.toBeInTheDocument();
    expect(getConfirmButton()).toBeEnabled();
  });

  it("shows the server's error and stays confirmable for a retry", () => {
    renderModal({ errorMessage: SERVER_ERROR });

    expect(screen.getByText(SERVER_ERROR)).toBeInTheDocument();
    expect(getEveryInput()).not.toHaveAttribute('aria-invalid', 'true');
    expect(getConfirmButton()).toBeEnabled();
  });

  it("shows the validation error instead of the server's error", () => {
    renderModal({ errorMessage: SERVER_ERROR });

    setEvery('999');

    expect(screen.getByText(INVALID_EVERY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(SERVER_ERROR)).not.toBeInTheDocument();
  });

  it('cannot be confirmed twice while the workflow is being created', () => {
    renderModal({ isCreating: true });

    expect(getConfirmButton()).toBeDisabled();

    fireEvent.click(getConfirmButton());

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels from the cancel button', () => {
    renderModal();

    fireEvent.click(getCancelButton());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels from the close button', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Closes this modal window'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  describe("the crawl's index, start URLs and sitemap URLs", () => {
    it("confirms with the crawl's index, start URLs and sitemap URLs", () => {
      renderModal({
        crawl: {
          ...crawl,
          indexName: 'docs',
          seedUrls: ['https://example.com/blog', 'https://docs.example.com'],
          sitemapUrls: ['https://example.com/sitemap-docs.xml'],
        },
      });

      expect(getConfirmButton()).toBeEnabled();
      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith({
        url: 'https://example.com/docs',
        maxDepth: 4,
        maxDocuments: 120,
        includePaths: [],
        excludePaths: [],
        indexName: 'docs',
        seedUrls: ['https://example.com/blog', 'https://docs.example.com'],
        sitemapUrls: ['https://example.com/sitemap-docs.xml'],
        every: 1,
        unit: 'd',
      });
    });

    it("carries the crawl's targets along with its paths and the interval the user chose", () => {
      renderModal({
        crawl: {
          ...crawl,
          includePaths: ['/docs'],
          excludePaths: ['/docs/archive'],
          seedUrls: ['https://docs.example.com'],
        },
      });
      setEvery('3');
      fireEvent.change(getUnitSelect(), { target: { value: 'h' } });

      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledWith({
        url: 'https://example.com/docs',
        maxDepth: 4,
        maxDocuments: 120,
        includePaths: ['/docs'],
        excludePaths: ['/docs/archive'],
        indexName: 'web-crawl-example-com',
        seedUrls: ['https://docs.example.com'],
        sitemapUrls: [],
        every: 3,
        unit: 'h',
      });
    });

    it.each([
      ['start URLs', { seedUrls: ['https://docs.example.com'] }],
      ['sitemap URLs', { sitemapUrls: ['https://example.com/sitemap-docs.xml'] }],
    ])("carries only the crawl's %s when it has no others", (_, targets) => {
      renderModal({ crawl: { ...crawl, ...targets } });

      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ seedUrls: [], sitemapUrls: [], ...targets })
      );
    });

    it("carries the crawl's URLs with commas in them unchanged", () => {
      const seedUrls = ['https://example.com/x,y', 'https://docs.example.com/?ids=1,2'];
      const sitemapUrls = ['https://example.com/sitemap,1.xml'];
      renderModal({ crawl: { ...crawl, seedUrls, sitemapUrls } });

      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ seedUrls, sitemapUrls }));
    });

    it("carries 20 start URLs and 20 sitemap URLs of the crawl's", () => {
      const urls = createUrls(20);
      renderModal({ crawl: { ...crawl, seedUrls: urls, sitemapUrls: urls } });

      expect(getConfirmButton()).toBeEnabled();
      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ seedUrls: urls, sitemapUrls: urls })
      );
    });

    it('says that the schedule crawls into the same index', () => {
      renderModal({ crawl: { ...crawl, indexName: 'docs' } });

      expect(screen.getByTestId('webCrawlScheduleModal')).toHaveTextContent(
        'into the same index and with the same options'
      );
    });
  });

  describe('without a crawl to repeat', () => {
    const renderNewModal = () =>
      renderWithWebCrawlerContext(
        <WebCrawlScheduleModal isCreating={false} onConfirm={onConfirm} onCancel={onCancel} />
      );

    const getUrlInput = () => screen.getByTestId('webCrawlScheduleUrl');
    const setUrl = (value: string) => fireEvent.change(getUrlInput(), { target: { value } });
    const getIncludePathsInput = () => screen.getByTestId('webCrawlIncludePaths');
    const getExcludePathsInput = () => screen.getByTestId('webCrawlExcludePaths');
    const setIncludePaths = (value: string) =>
      fireEvent.change(getIncludePathsInput(), { target: { value } });
    const setExcludePaths = (value: string) =>
      fireEvent.change(getExcludePathsInput(), { target: { value } });
    const createPaths = (count: number) =>
      Array.from({ length: count }, (_, index) => `/p${index}`);

    it('asks for the website and limits, with the default limits', () => {
      renderNewModal();

      expect(screen.getByTestId('webCrawlScheduleModal')).toHaveTextContent(
        'Creates a workflow that crawls a website on this interval'
      );
      expect(screen.getByText('Website')).toBeInTheDocument();
      expect(getUrlInput()).toHaveValue('');
      expect(screen.getByTestId('webCrawlScheduleMaxDepth')).toHaveValue(2);
      expect(screen.getByTestId('webCrawlScheduleMaxDocuments')).toHaveValue(500);
    });

    it('asks for the paths, with none to start with', () => {
      renderNewModal();

      expect(screen.getByText('Only paths')).toBeInTheDocument();
      expect(screen.getByText('Skip paths')).toBeInTheDocument();
      expect(getIncludePathsInput()).toHaveValue('');
      expect(getIncludePathsInput()).toBeEnabled();
      expect(getIncludePathsInput()).not.toBeInvalid();
      expect(getExcludePathsInput()).toHaveValue('');
      expect(getExcludePathsInput()).toBeEnabled();
      expect(getExcludePathsInput()).not.toBeInvalid();
      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
    });

    it('gives both path inputs an accessible name', () => {
      renderNewModal();

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
    });

    it('does not ask for them when repeating a crawl', () => {
      renderModal();

      expect(screen.queryByTestId('webCrawlScheduleUrl')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlScheduleMaxDepth')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlScheduleMaxDocuments')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlIncludePaths')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlExcludePaths')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlTargets')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlIndexName')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlSeedUrls')).not.toBeInTheDocument();
      expect(screen.queryByTestId('webCrawlSitemapUrls')).not.toBeInTheDocument();
    });

    it('cannot be confirmed until the website is a crawlable URL', () => {
      renderNewModal();

      expect(getConfirmButton()).toBeDisabled();
      expect(screen.queryByText(INVALID_URL_MESSAGE)).not.toBeInTheDocument();

      setUrl('ftp://example.com');
      fireEvent.blur(getUrlInput());

      expect(getConfirmButton()).toBeDisabled();
      expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();

      setUrl('https://example.com');

      expect(getConfirmButton()).toBeEnabled();
      expect(screen.queryByText(INVALID_URL_MESSAGE)).not.toBeInTheDocument();
    });

    it.each([
      ['webCrawlScheduleMaxDepth', '6', 'Enter a whole number from 0 to 5.'],
      ['webCrawlScheduleMaxDepth', '1.5', 'Enter a whole number from 0 to 5.'],
      ['webCrawlScheduleMaxDocuments', '0', 'Enter a whole number from 1 to 1000.'],
      ['webCrawlScheduleMaxDocuments', '1001', 'Enter a whole number from 1 to 1000.'],
      ['webCrawlScheduleMaxDocuments', '', 'Enter a whole number from 1 to 1000.'],
    ])('cannot be confirmed with %s set to "%s"', (testSubj, value, message) => {
      renderNewModal();
      setUrl('https://example.com');

      fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

      expect(getConfirmButton()).toBeDisabled();
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('confirms with the trimmed website, the limits and the interval the user entered', () => {
      renderNewModal();

      setUrl('  https://example.com/blog  ');
      fireEvent.change(screen.getByTestId('webCrawlScheduleMaxDepth'), { target: { value: '0' } });
      fireEvent.change(screen.getByTestId('webCrawlScheduleMaxDocuments'), {
        target: { value: '25' },
      });
      setEvery('6');
      fireEvent.change(getUnitSelect(), { target: { value: 'h' } });
      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith({
        url: 'https://example.com/blog',
        maxDepth: 0,
        maxDocuments: 25,
        includePaths: [],
        excludePaths: [],
        seedUrls: [],
        sitemapUrls: [],
        every: 6,
        unit: 'h',
      });
    });

    it('confirms with the paths the user entered, without blanks or duplicates', () => {
      renderNewModal();
      setUrl('https://example.com');
      setIncludePaths(' /docs,/blog   /docs,, ');
      setExcludePaths('/tags\t/search , /tags');

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: ['/docs', '/blog'],
        excludePaths: ['/tags', '/search'],
        seedUrls: [],
        sitemapUrls: [],
        every: 1,
        unit: 'd',
      });
    });

    it.each(['   ', ' , ,, '])('treats paths of %p as no rules', (value) => {
      renderNewModal();
      setUrl('https://example.com');
      setIncludePaths(value);
      setExcludePaths(value);

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ includePaths: [], excludePaths: [] })
      );
    });

    it.each([
      ['webCrawlIncludePaths', 'webCrawlExcludePaths', 'docs'],
      ['webCrawlIncludePaths', 'webCrawlExcludePaths', '/docs, blog'],
      ['webCrawlExcludePaths', 'webCrawlIncludePaths', 'tags'],
      ['webCrawlExcludePaths', 'webCrawlIncludePaths', 'https://example.com/tags'],
    ])('cannot be confirmed with %s set to "%s"', (testSubj, otherTestSubj, value) => {
      renderNewModal();
      setUrl('https://example.com');
      expect(getConfirmButton()).toBeEnabled();

      fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(screen.getByTestId(testSubj)).toBeInvalid();
      expect(screen.getByTestId(otherTestSubj)).not.toBeInvalid();
      expect(getConfirmButton()).toBeDisabled();

      fireEvent.click(getConfirmButton());

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('shows the path error once when both lists are invalid', () => {
      renderNewModal();
      setUrl('https://example.com');

      setIncludePaths('docs');
      setExcludePaths('tags');

      expect(screen.getAllByText(INVALID_PATHS_MESSAGE)).toHaveLength(1);
      expect(getConfirmButton()).toBeDisabled();
    });

    it.each(['webCrawlIncludePaths', 'webCrawlExcludePaths'])(
      'accepts 20 paths and rejects 21 in %s',
      (testSubj) => {
        renderNewModal();
        setUrl('https://example.com');

        fireEvent.change(screen.getByTestId(testSubj), {
          target: { value: createPaths(21).join(', ') },
        });

        expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
        expect(getConfirmButton()).toBeDisabled();

        fireEvent.change(screen.getByTestId(testSubj), {
          target: { value: createPaths(20).join(', ') },
        });

        expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
        expect(getConfirmButton()).toBeEnabled();
      }
    );

    it('accepts a path of 256 characters and rejects one of 257', () => {
      renderNewModal();
      setUrl('https://example.com');
      const longestPath = `/${'a'.repeat(255)}`;

      setIncludePaths(`${longestPath}a`);

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(getConfirmButton()).toBeDisabled();

      setIncludePaths(longestPath);

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ includePaths: [longestPath] })
      );
    });

    it('can be confirmed again once invalid paths are corrected', () => {
      renderNewModal();
      setUrl('https://example.com');
      setExcludePaths('tags');
      expect(getConfirmButton()).toBeDisabled();

      setExcludePaths('/tags');

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(getExcludePathsInput()).not.toBeInvalid();
      expect(getConfirmButton()).toBeEnabled();

      fireEvent.click(getConfirmButton());

      expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ excludePaths: ['/tags'] }));
    });

    it('stays unconfirmable with valid paths while the website is missing', () => {
      renderNewModal();

      setIncludePaths('/docs');

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(getConfirmButton()).toBeDisabled();
    });

    describe('index, start URLs and sitemap URLs', () => {
      const getIndexNameInput = () => screen.getByTestId('webCrawlIndexName');
      const getSeedUrlsInput = () => screen.getByTestId('webCrawlSeedUrls');
      const getSitemapUrlsInput = () => screen.getByTestId('webCrawlSitemapUrls');
      const setIndexName = (value: string) =>
        fireEvent.change(getIndexNameInput(), { target: { value } });
      const setSeedUrls = (value: string) =>
        fireEvent.change(getSeedUrlsInput(), { target: { value } });
      const setSitemapUrls = (value: string) =>
        fireEvent.change(getSitemapUrlsInput(), { target: { value } });
      const openTargets = () => fireEvent.click(screen.getByText('Index, start URLs and sitemaps'));

      it('asks for them out of sight, with none to start with', () => {
        renderNewModal();

        const targets = screen.getByTestId('webCrawlTargets');

        expect(screen.getByTestId('webCrawlScheduleModal')).toContainElement(targets);
        for (const input of [getIndexNameInput(), getSeedUrlsInput(), getSitemapUrlsInput()]) {
          expect(targets).toContainElement(input);
          expect(input).toHaveValue('');
          expect(input).toBeEnabled();
          expect(input).not.toBeInvalid();
          expect(input).not.toBeVisible();
        }

        openTargets();

        expect(getIndexNameInput()).toBeVisible();
        expect(getSeedUrlsInput()).toBeVisible();
        expect(getSitemapUrlsInput()).toBeVisible();
        expect(screen.getByText('Index')).toBeVisible();
        expect(screen.getByText('More start URLs')).toBeVisible();
        expect(screen.getByText('Sitemap URLs')).toBeVisible();
        expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
        expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      });

      it('gives every target input an accessible name', () => {
        renderNewModal();
        openTargets();

        expect(screen.getByRole('textbox', { name: 'Index' })).toBe(getIndexNameInput());
        expect(screen.getByRole('textbox', { name: 'More start URLs' })).toBe(getSeedUrlsInput());
        expect(screen.getByRole('textbox', { name: 'Sitemap URLs' })).toBe(getSitemapUrlsInput());
      });

      it('confirms with the default index and no extra URLs when they are untouched', () => {
        renderNewModal();
        setUrl('https://example.com');

        fireEvent.click(getConfirmButton());

        expect(onConfirm).toHaveBeenCalledTimes(1);
        const [[request]] = onConfirm.mock.calls;
        expect(request.indexName).toBeUndefined();
        expect(request.seedUrls).toEqual([]);
        expect(request.sitemapUrls).toEqual([]);
      });

      it('confirms with the index, start URLs and sitemap URLs the user entered', () => {
        renderNewModal();
        setUrl('https://example.com');
        openTargets();
        setIndexName('  docs ');
        setSeedUrls(
          ' https://example.com/blog,https://docs.example.com   https://example.com/blog'
        );
        setSitemapUrls('https://example.com/sitemap-docs.xml , https://example.com/x,y.xml');

        expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
        expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
        fireEvent.click(getConfirmButton());

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onConfirm).toHaveBeenCalledWith({
          url: 'https://example.com',
          maxDepth: 2,
          maxDocuments: 500,
          includePaths: [],
          excludePaths: [],
          indexName: 'docs',
          seedUrls: ['https://example.com/blog', 'https://docs.example.com'],
          sitemapUrls: ['https://example.com/sitemap-docs.xml', 'https://example.com/x,y.xml'],
          every: 1,
          unit: 'd',
        });
      });

      it.each(['   ', '\t'])('treats an index name of %p as the default index', (value) => {
        renderNewModal();
        setUrl('https://example.com');
        setIndexName(value);
        setSeedUrls(value);
        setSitemapUrls(value);

        expect(getConfirmButton()).toBeEnabled();
        fireEvent.click(getConfirmButton());

        const [[request]] = onConfirm.mock.calls;
        expect(request.indexName).toBeUndefined();
        expect(request.seedUrls).toEqual([]);
        expect(request.sitemapUrls).toEqual([]);
      });

      it.each([
        ['an uppercase letter', 'Docs'],
        ['a leading dot', '.docs'],
        ['a leading hyphen', '-docs'],
        ['a leading underscore', '_docs'],
        ['a space', 'my docs'],
        ['256 characters', 'a'.repeat(256)],
      ])('cannot be confirmed with an index name with %s', (_, value) => {
        renderNewModal();
        setUrl('https://example.com');
        openTargets();
        expect(getConfirmButton()).toBeEnabled();

        setIndexName(value);

        expect(screen.getByText(INVALID_INDEX_NAME_MESSAGE)).toBeVisible();
        expect(getIndexNameInput()).toBeInvalid();
        expect(getSeedUrlsInput()).not.toBeInvalid();
        expect(getSitemapUrlsInput()).not.toBeInvalid();
        expect(getConfirmButton()).toBeDisabled();

        fireEvent.click(getConfirmButton());

        expect(onConfirm).not.toHaveBeenCalled();
      });

      it('accepts an index name of 255 characters', () => {
        renderNewModal();
        setUrl('https://example.com');
        const longestName = 'a'.repeat(255);

        setIndexName(longestName);

        expect(getConfirmButton()).toBeEnabled();
        fireEvent.click(getConfirmButton());

        expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ indexName: longestName }));
      });

      it.each([
        ['webCrawlSeedUrls', 'webCrawlSitemapUrls', 'docs.example.com'],
        ['webCrawlSeedUrls', 'webCrawlSitemapUrls', 'https://a.example, ftp://b.example'],
        ['webCrawlSitemapUrls', 'webCrawlSeedUrls', '/sitemap.xml'],
        ['webCrawlSitemapUrls', 'webCrawlSeedUrls', 'file:///sitemap.xml'],
      ])('cannot be confirmed with %s set to "%s"', (testSubj, otherTestSubj, value) => {
        renderNewModal();
        setUrl('https://example.com');
        openTargets();
        expect(getConfirmButton()).toBeEnabled();

        fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

        expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(1);
        expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeVisible();
        expect(screen.getByTestId(testSubj)).toBeInvalid();
        expect(screen.getByTestId(otherTestSubj)).not.toBeInvalid();
        expect(getConfirmButton()).toBeDisabled();

        fireEvent.click(getConfirmButton());

        expect(onConfirm).not.toHaveBeenCalled();
      });

      it.each(['webCrawlSeedUrls', 'webCrawlSitemapUrls'])(
        'accepts 20 URLs and rejects 21 in %s',
        (testSubj) => {
          renderNewModal();
          setUrl('https://example.com');

          fireEvent.change(screen.getByTestId(testSubj), {
            target: { value: createUrls(21).join(' ') },
          });

          expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeInTheDocument();
          expect(getConfirmButton()).toBeDisabled();

          fireEvent.change(screen.getByTestId(testSubj), {
            target: { value: createUrls(20).join(' ') },
          });

          expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
          expect(getConfirmButton()).toBeEnabled();
        }
      );

      it.each([
        ['webCrawlSeedUrls', 'seedUrls'],
        ['webCrawlSitemapUrls', 'sitemapUrls'],
      ])('accepts a URL of 2048 characters and rejects one of 2049 in %s', (testSubj, key) => {
        renderNewModal();
        setUrl('https://example.com');
        const longestUrl = createUrlOfLength(2048);

        fireEvent.change(screen.getByTestId(testSubj), { target: { value: `${longestUrl}a` } });

        expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeInTheDocument();
        expect(getConfirmButton()).toBeDisabled();

        fireEvent.change(screen.getByTestId(testSubj), { target: { value: longestUrl } });

        expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
        fireEvent.click(getConfirmButton());

        expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ [key]: [longestUrl] }));
      });

      it('can be confirmed again once every invalid target is corrected', () => {
        renderNewModal();
        setUrl('https://example.com');
        openTargets();
        setIndexName('Docs');
        setSeedUrls('docs.example.com');
        expect(getConfirmButton()).toBeDisabled();

        setIndexName('docs');
        expect(getConfirmButton()).toBeDisabled();

        setSeedUrls('https://docs.example.com');

        expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
        expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
        expect(getConfirmButton()).toBeEnabled();

        fireEvent.click(getConfirmButton());

        expect(onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({ indexName: 'docs', seedUrls: ['https://docs.example.com'] })
        );
      });

      it('stays unconfirmable with valid targets while the website is missing', () => {
        renderNewModal();

        setIndexName('docs');
        setSeedUrls('https://docs.example.com');

        expect(getConfirmButton()).toBeDisabled();
      });
    });
  });
});
