/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithWebCrawlerContext } from '../test_utils';
import { WebCrawlForm } from './web_crawl_form';
import { INVALID_PATHS_MESSAGE } from './web_crawl_path_rules';

const INVALID_URL_MESSAGE = 'Enter a URL that starts with http:// or https://';
const SERVER_ERROR = 'example.com is already being crawled';
const INVALID_INDEX_NAME_MESSAGE =
  'Start with a lowercase letter or a digit, and use only lowercase letters, digits, dots, hyphens and underscores.';
const INVALID_URLS_MESSAGE = 'Enter up to 20 URLs that start with http:// or https://';

// The panel's tests cover validation and submission end to end; these cover the form's own props.
describe('WebCrawlForm', () => {
  const onSubmit = jest.fn();

  const renderForm = (
    props: {
      isStarting?: boolean;
      errorMessage?: string;
      optionsDisplay?: 'inline' | 'collapsed';
      defaultMaxDocuments?: number;
    } = {}
  ) =>
    renderWithWebCrawlerContext(<WebCrawlForm onSubmit={onSubmit} isStarting={false} {...props} />);

  const getUrlInput = () => screen.getByTestId('webCrawlUrl');
  const getSubmitButton = () => screen.getByTestId('webCrawlSubmit');
  const getMaxDepthInput = () => screen.getByTestId('webCrawlMaxDepth');
  const getMaxDocumentsInput = () => screen.getByTestId('webCrawlMaxDocuments');
  const getIncludePathsInput = () => screen.getByTestId('webCrawlIncludePaths');
  const getExcludePathsInput = () => screen.getByTestId('webCrawlExcludePaths');
  const setIncludePaths = (value: string) =>
    fireEvent.change(getIncludePathsInput(), { target: { value } });
  const setExcludePaths = (value: string) =>
    fireEvent.change(getExcludePathsInput(), { target: { value } });
  const createPaths = (count: number) => Array.from({ length: count }, (_, index) => `/p${index}`);
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
  const createUrls = (count: number) =>
    Array.from({ length: count }, (_, index) => `https://example.com/p${index}`);
  const createUrlOfLength = (length: number) => {
    const prefix = 'https://example.com/';
    return `${prefix}${'a'.repeat(length - prefix.length)}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hands the trimmed URL and the limits to the caller', () => {
    renderForm();
    fireEvent.change(getUrlInput(), { target: { value: ' https://example.com ' } });
    fireEvent.change(getMaxDepthInput(), { target: { value: '0' } });
    fireEvent.change(getMaxDocumentsInput(), { target: { value: '7' } });

    fireEvent.click(getSubmitButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      url: 'https://example.com',
      maxDepth: 0,
      maxDocuments: 7,
      includePaths: [],
      excludePaths: [],
      seedUrls: [],
      sitemapUrls: [],
    });
  });

  it('keeps what the user entered after submitting', () => {
    renderForm();
    fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
    fireEvent.change(getMaxDepthInput(), { target: { value: '4' } });

    fireEvent.click(getSubmitButton());

    expect(getUrlInput()).toHaveValue('https://example.com');
    expect(getMaxDepthInput()).toHaveValue(4);
  });

  it('disables every control while a crawl is starting', () => {
    renderForm({ isStarting: true });

    expect(getUrlInput()).toBeDisabled();
    expect(getSubmitButton()).toBeDisabled();
    expect(getMaxDepthInput()).toBeDisabled();
    expect(getMaxDocumentsInput()).toBeDisabled();
    expect(getIncludePathsInput()).toBeDisabled();
    expect(getExcludePathsInput()).toBeDisabled();
    expect(getIndexNameInput()).toBeDisabled();
    expect(getSeedUrlsInput()).toBeDisabled();
    expect(getSitemapUrlsInput()).toBeDisabled();
  });

  it("shows the server's answer to the last submission without marking the URL invalid", () => {
    renderForm({ errorMessage: SERVER_ERROR });

    expect(screen.getByText(SERVER_ERROR)).toBeInTheDocument();
    expect(getUrlInput()).not.toBeInvalid();
  });

  it("shows a validation error instead of the server's answer", () => {
    renderForm({ errorMessage: SERVER_ERROR });
    fireEvent.change(getUrlInput(), { target: { value: 'not a url' } });

    fireEvent.click(getSubmitButton());

    expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(SERVER_ERROR)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an invalid limit instead of the server's answer", () => {
    renderForm({ errorMessage: SERVER_ERROR });

    fireEvent.change(getMaxDocumentsInput(), { target: { value: '0' } });

    expect(screen.getByText(/Max depth must be a whole number/)).toBeInTheDocument();
    expect(screen.queryByText(SERVER_ERROR)).not.toBeInTheDocument();
  });

  it('reports an invalid URL before invalid limits', () => {
    renderForm();
    fireEvent.change(getMaxDepthInput(), { target: { value: '9' } });
    fireEvent.change(getUrlInput(), { target: { value: 'not a url' } });

    fireEvent.click(getSubmitButton());

    expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/Max depth must be a whole number/)).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe('options display', () => {
    const getOptions = () => screen.getByTestId('webCrawlAdvancedOptions');
    const getOptionsToggle = () => screen.getByRole('button', { name: 'Advanced options' });

    it('shows every field beside the URL by default, with no disclosure', () => {
      renderForm();

      expect(screen.queryByTestId('webCrawlAdvancedOptions')).not.toBeInTheDocument();
      expect(getMaxDepthInput()).toBeVisible();
      expect(getMaxDocumentsInput()).toBeVisible();
      expect(getIncludePathsInput()).toBeVisible();
    });

    it('keeps everything but the URL behind a closed disclosure when collapsed', () => {
      renderForm({ optionsDisplay: 'collapsed' });

      expect(getUrlInput()).toBeVisible();
      expect(getSubmitButton()).toBeVisible();
      expect(getOptionsToggle()).toHaveAttribute('aria-expanded', 'false');
      expect(getOptions()).toContainElement(getMaxDepthInput());
      expect(getOptions()).toContainElement(getMaxDocumentsInput());
      expect(getOptions()).toContainElement(getIncludePathsInput());
      expect(getOptions()).toContainElement(getExcludePathsInput());
      expect(getOptions()).toContainElement(getIndexNameInput());
    });

    it('submits the URL with the default limits while the options stay closed', () => {
      renderForm({ optionsDisplay: 'collapsed' });

      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenCalledWith({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: [],
        excludePaths: [],
        indexName: undefined,
        seedUrls: [],
        sitemapUrls: [],
      });
      expect(getOptionsToggle()).toHaveAttribute('aria-expanded', 'false');
    });

    it("starts from the host's page limit, which can be raised to the crawler's maximum", () => {
      renderForm({ optionsDisplay: 'collapsed', defaultMaxDocuments: 50 });

      expect(getMaxDocumentsInput()).toHaveValue(50);
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxDepth: 2, maxDocuments: 50 })
      );

      fireEvent.change(getMaxDocumentsInput(), { target: { value: '1000' } });
      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ maxDocuments: 1000 }));

      fireEvent.change(getMaxDocumentsInput(), { target: { value: '1001' } });
      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it('opens and closes the options, and submits what was entered in them', () => {
      renderForm({ optionsDisplay: 'collapsed' });

      fireEvent.click(getOptionsToggle());
      expect(getOptionsToggle()).toHaveAttribute('aria-expanded', 'true');

      fireEvent.change(getMaxDocumentsInput(), { target: { value: '25' } });
      fireEvent.click(getOptionsToggle());
      expect(getOptionsToggle()).toHaveAttribute('aria-expanded', 'false');

      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ maxDocuments: 25 }));
    });

    it('keeps the options open while one of them is invalid', () => {
      renderForm({ optionsDisplay: 'collapsed' });

      fireEvent.click(getOptionsToggle());
      fireEvent.change(getMaxDocumentsInput(), { target: { value: '0' } });
      fireEvent.click(getOptionsToggle());

      expect(getOptionsToggle()).toHaveAttribute('aria-expanded', 'true');

      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      fireEvent.click(getSubmitButton());
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('path rules', () => {
    it('starts with no path rules and no path error', () => {
      renderForm();

      expect(getIncludePathsInput()).toBeEnabled();
      expect(getIncludePathsInput()).toHaveValue('');
      expect(getIncludePathsInput()).not.toBeInvalid();
      expect(getExcludePathsInput()).toBeEnabled();
      expect(getExcludePathsInput()).toHaveValue('');
      expect(getExcludePathsInput()).not.toBeInvalid();
      expect(screen.getByText('Only paths')).toBeInTheDocument();
      expect(screen.getByText('Skip paths')).toBeInTheDocument();
      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
    });

    it('hands the paths the user entered to the caller as lists', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      setIncludePaths('/docs, /blog');
      setExcludePaths('/docs/archive');

      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: ['/docs', '/blog'],
        excludePaths: ['/docs/archive'],
        seedUrls: [],
        sitemapUrls: [],
      });
    });

    it('reads paths separated by commas, spaces and tabs, without blanks or duplicates', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      setIncludePaths('  /docs,/blog   /guide,, /docs ,');
      setExcludePaths('/tags\t/search \t /tags');

      fireEvent.click(getSubmitButton());

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          includePaths: ['/docs', '/blog', '/guide'],
          excludePaths: ['/tags', '/search'],
        })
      );
    });

    it.each(['   ', ',', ' , ,, '])('treats paths of %p as no rules', (value) => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      setIncludePaths(value);
      setExcludePaths(value);

      fireEvent.click(getSubmitButton());

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ includePaths: [], excludePaths: [] })
      );
    });

    it.each(['docs', '/docs, blog', 'https://example.com/docs', '*'])(
      'marks only paths of %p invalid and does not submit',
      (value) => {
        renderForm();
        fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });

        setIncludePaths(value);

        expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
        expect(getIncludePathsInput()).toBeInvalid();
        expect(getExcludePathsInput()).not.toBeInvalid();

        fireEvent.click(getSubmitButton());

        expect(onSubmit).not.toHaveBeenCalled();
      }
    );

    it('marks invalid skip paths, and only those, invalid and does not submit', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      setIncludePaths('/docs');

      setExcludePaths('tags');

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(getExcludePathsInput()).toBeInvalid();
      expect(getIncludePathsInput()).not.toBeInvalid();

      fireEvent.click(getSubmitButton());

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('shows the path error once when both lists are invalid', () => {
      renderForm();

      setIncludePaths('docs');
      setExcludePaths('tags');

      expect(screen.getAllByText(INVALID_PATHS_MESSAGE)).toHaveLength(1);
      expect(getIncludePathsInput()).toBeInvalid();
      expect(getExcludePathsInput()).toBeInvalid();
    });

    it('accepts 20 paths in each list', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      const paths = createPaths(20);
      setIncludePaths(paths.join(', '));
      setExcludePaths(paths.join(' '));

      fireEvent.click(getSubmitButton());

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ includePaths: paths, excludePaths: paths })
      );
    });

    it.each([
      ['only paths', 'webCrawlIncludePaths'],
      ['skip paths', 'webCrawlExcludePaths'],
    ])('rejects 21 %s', (_, testSubj) => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      fireEvent.change(screen.getByTestId(testSubj), {
        target: { value: createPaths(21).join(', ') },
      });

      fireEvent.click(getSubmitButton());

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(screen.getByTestId(testSubj)).toBeInvalid();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('counts repeated paths once against the limit of 20', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      const paths = createPaths(20);
      setIncludePaths([...paths, ...paths].join(', '));

      fireEvent.click(getSubmitButton());

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ includePaths: paths }));
    });

    it('accepts a path of 256 characters and rejects one of 257', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      const longestPath = `/${'a'.repeat(255)}`;

      setExcludePaths(`${longestPath}a`);
      fireEvent.click(getSubmitButton());

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      setExcludePaths(longestPath);
      fireEvent.click(getSubmitButton());

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ excludePaths: [longestPath] })
      );
    });

    it('submits once invalid paths are corrected', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      setIncludePaths('docs');
      fireEvent.click(getSubmitButton());
      expect(onSubmit).not.toHaveBeenCalled();

      setIncludePaths('/docs');

      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(getIncludePathsInput()).not.toBeInvalid();

      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ includePaths: ['/docs'] }));
    });

    it('keeps the paths the user entered after submitting', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      setIncludePaths('/docs, /blog');
      setExcludePaths('/tags');

      fireEvent.click(getSubmitButton());

      expect(getIncludePathsInput()).toHaveValue('/docs, /blog');
      expect(getExcludePathsInput()).toHaveValue('/tags');
    });

    it('reports an invalid URL before invalid paths', () => {
      renderForm();
      setIncludePaths('docs');
      fireEvent.change(getUrlInput(), { target: { value: 'not a url' } });

      fireEvent.click(getSubmitButton());

      expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('reports invalid limits before invalid paths', () => {
      renderForm();
      fireEvent.change(getUrlInput(), { target: { value: 'https://example.com' } });
      setIncludePaths('docs');
      fireEvent.change(getMaxDepthInput(), { target: { value: '9' } });

      fireEvent.click(getSubmitButton());

      expect(screen.getByText(/Max depth must be a whole number/)).toBeInTheDocument();
      expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      fireEvent.change(getMaxDepthInput(), { target: { value: '2' } });

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
    });

    it("shows invalid paths instead of the server's answer", () => {
      renderForm({ errorMessage: SERVER_ERROR });

      setExcludePaths('tags');

      expect(screen.getByText(INVALID_PATHS_MESSAGE)).toBeInTheDocument();
      expect(screen.queryByText(SERVER_ERROR)).not.toBeInTheDocument();

      setExcludePaths('/tags');

      expect(screen.getByText(SERVER_ERROR)).toBeInTheDocument();
    });
  });

  describe('crawl targets', () => {
    const submitUrl = (url = 'https://example.com') => {
      fireEvent.change(getUrlInput(), { target: { value: url } });
      fireEvent.click(getSubmitButton());
    };

    it('tucks the index, start URLs and sitemap URLs away below the path rules', () => {
      renderForm();

      const targets = screen.getByTestId('webCrawlTargets');

      expect(screen.getAllByTestId(/^webCrawl(ExcludePaths|Targets)$/)).toEqual([
        getExcludePathsInput(),
        targets,
      ]);
      for (const input of [getIndexNameInput(), getSeedUrlsInput(), getSitemapUrlsInput()]) {
        expect(targets).toContainElement(input);
        expect(input).toBeEnabled();
        expect(input).toHaveValue('');
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

    it('asks for the default index and no extra URLs when the targets are untouched', () => {
      renderForm();

      submitUrl();

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const [[request]] = onSubmit.mock.calls;
      expect(request.indexName).toBeUndefined();
      expect(request.seedUrls).toEqual([]);
      expect(request.sitemapUrls).toEqual([]);
      expect(JSON.parse(JSON.stringify(request))).toEqual({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: [],
        excludePaths: [],
        seedUrls: [],
        sitemapUrls: [],
      });
    });

    it('hands the index, start URLs and sitemap URLs the user entered to the caller', () => {
      renderForm();
      openTargets();
      setIndexName('docs');
      setSeedUrls('https://example.com/blog https://docs.example.com');
      setSitemapUrls('https://example.com/sitemap-docs.xml');

      submitUrl();

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        url: 'https://example.com',
        maxDepth: 2,
        maxDocuments: 500,
        includePaths: [],
        excludePaths: [],
        indexName: 'docs',
        seedUrls: ['https://example.com/blog', 'https://docs.example.com'],
        sitemapUrls: ['https://example.com/sitemap-docs.xml'],
      });
    });

    it('hands the targets along with the limits and paths the user entered', () => {
      renderForm();
      fireEvent.change(getMaxDepthInput(), { target: { value: '1' } });
      fireEvent.change(getMaxDocumentsInput(), { target: { value: '40' } });
      setIncludePaths('/docs');
      setExcludePaths('/docs/archive');
      setIndexName('docs');
      setSeedUrls('https://docs.example.com');

      submitUrl(' https://example.com/docs ');

      expect(onSubmit).toHaveBeenCalledWith({
        url: 'https://example.com/docs',
        maxDepth: 1,
        maxDocuments: 40,
        includePaths: ['/docs'],
        excludePaths: ['/docs/archive'],
        indexName: 'docs',
        seedUrls: ['https://docs.example.com'],
        sitemapUrls: [],
      });
    });

    it('submits targets entered while they are tucked away again', () => {
      renderForm();
      openTargets();
      setIndexName('docs');
      openTargets();
      expect(getIndexNameInput()).not.toBeVisible();

      submitUrl();

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ indexName: 'docs' }));
    });

    it('trims the whitespace around the index name', () => {
      renderForm();
      setIndexName('  web-crawl_docs.v2 \t');

      submitUrl();

      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ indexName: 'web-crawl_docs.v2' })
      );
    });

    it.each(['', '   ', '\t'])('treats an index name of %p as the default index', (value) => {
      renderForm();
      setIndexName('docs');
      setIndexName(value);

      submitUrl();

      expect(getIndexNameInput()).not.toBeInvalid();
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0].indexName).toBeUndefined();
    });

    it.each([
      ['an uppercase letter', 'Docs'],
      ['a leading dot', '.docs'],
      ['a leading hyphen', '-docs'],
      ['a leading underscore', '_docs'],
      ['a space', 'my docs'],
      ['a wildcard', 'docs*'],
      ['256 characters', 'a'.repeat(256)],
    ])('marks an index name with %s invalid and does not submit', (_, value) => {
      renderForm();
      openTargets();

      setIndexName(value);

      expect(screen.getByText(INVALID_INDEX_NAME_MESSAGE)).toBeVisible();
      expect(getIndexNameInput()).toBeInvalid();
      expect(getSeedUrlsInput()).not.toBeInvalid();
      expect(getSitemapUrlsInput()).not.toBeInvalid();
      expect(getUrlInput()).not.toBeInvalid();

      submitUrl();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('accepts an index name of 255 characters', () => {
      renderForm();
      const longestName = 'a'.repeat(255);
      setIndexName(longestName);

      submitUrl();

      expect(getIndexNameInput()).not.toBeInvalid();
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ indexName: longestName }));
    });

    it('reads URLs separated by spaces, line breaks and commas, without blanks or duplicates', () => {
      renderForm();
      setSeedUrls(
        '  https://a.example,https://b.example/docs   https://a.example , http://c.example\t'
      );
      setSitemapUrls('https://a.example/sitemap.xml\t https://a.example/sitemap.xml');

      submitUrl();

      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          seedUrls: ['https://a.example', 'https://b.example/docs', 'http://c.example'],
          sitemapUrls: ['https://a.example/sitemap.xml'],
        })
      );
    });

    it('keeps the commas inside a URL', () => {
      renderForm();
      setSeedUrls('https://a.example/x,y, https://b.example/?ids=1,2');
      setSitemapUrls('https://a.example/sitemap,1.xml');

      submitUrl();

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          seedUrls: ['https://a.example/x,y', 'https://b.example/?ids=1,2'],
          sitemapUrls: ['https://a.example/sitemap,1.xml'],
        })
      );
    });

    it.each(['   ', ' \t '])('treats URLs of %p as none', (value) => {
      renderForm();
      setSeedUrls(value);
      setSitemapUrls(value);

      submitUrl();

      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ seedUrls: [], sitemapUrls: [] })
      );
    });

    it.each([
      ['webCrawlSeedUrls', 'webCrawlSitemapUrls', 'docs.example.com'],
      ['webCrawlSeedUrls', 'webCrawlSitemapUrls', 'ftp://docs.example.com'],
      ['webCrawlSeedUrls', 'webCrawlSitemapUrls', 'https://a.example /blog'],
      ['webCrawlSitemapUrls', 'webCrawlSeedUrls', 'sitemap.xml'],
      ['webCrawlSitemapUrls', 'webCrawlSeedUrls', 'file:///sitemap.xml'],
      ['webCrawlSitemapUrls', 'webCrawlSeedUrls', 'https://a.example/sitemap.xml, b.xml'],
    ])('marks only %s invalid when set to %p and does not submit', (testSubj, otherSubj, value) => {
      renderForm();
      openTargets();

      fireEvent.change(screen.getByTestId(testSubj), { target: { value } });

      expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(1);
      expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeVisible();
      expect(screen.getByTestId(testSubj)).toBeInvalid();
      expect(screen.getByTestId(otherSubj)).not.toBeInvalid();
      expect(getIndexNameInput()).not.toBeInvalid();

      submitUrl();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('accepts 20 start URLs and 20 sitemap URLs', () => {
      renderForm();
      const urls = createUrls(20);
      setSeedUrls(urls.join(' '));
      setSitemapUrls(urls.join(', '));

      submitUrl();

      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ seedUrls: urls, sitemapUrls: urls })
      );
    });

    it.each([
      ['start URLs', 'webCrawlSeedUrls'],
      ['sitemap URLs', 'webCrawlSitemapUrls'],
    ])('rejects 21 %s', (_, testSubj) => {
      renderForm();
      fireEvent.change(screen.getByTestId(testSubj), {
        target: { value: createUrls(21).join(' ') },
      });

      submitUrl();

      expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeInTheDocument();
      expect(screen.getByTestId(testSubj)).toBeInvalid();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('counts repeated URLs once against the limit of 20', () => {
      renderForm();
      const urls = createUrls(20);
      setSeedUrls([...urls, ...urls].join(' '));

      submitUrl();

      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ seedUrls: urls }));
    });

    it.each([
      ['start URL', 'webCrawlSeedUrls', 'seedUrls'],
      ['sitemap URL', 'webCrawlSitemapUrls', 'sitemapUrls'],
    ])('accepts a %s of 2048 characters and rejects one of 2049', (_, testSubj, key) => {
      renderForm();
      const longestUrl = createUrlOfLength(2048);

      fireEvent.change(screen.getByTestId(testSubj), { target: { value: `${longestUrl}a` } });
      submitUrl();

      expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();

      fireEvent.change(screen.getByTestId(testSubj), { target: { value: longestUrl } });
      fireEvent.click(getSubmitButton());

      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ [key]: [longestUrl] }));
    });

    it('shows an error under each invalid target', () => {
      renderForm();
      openTargets();

      setIndexName('Docs');
      setSeedUrls('a.example');
      setSitemapUrls('sitemap.xml');

      expect(screen.getAllByText(INVALID_INDEX_NAME_MESSAGE)).toHaveLength(1);
      expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(2);

      submitUrl();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits once every invalid target is corrected', () => {
      renderForm();
      openTargets();
      setIndexName('Docs');
      setSeedUrls('a.example');
      submitUrl();
      expect(onSubmit).not.toHaveBeenCalled();

      setIndexName('docs');
      fireEvent.click(getSubmitButton());
      expect(onSubmit).not.toHaveBeenCalled();

      setSeedUrls('https://a.example');

      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();

      fireEvent.click(getSubmitButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ indexName: 'docs', seedUrls: ['https://a.example'] })
      );
    });

    it('keeps the targets the user entered after submitting', () => {
      renderForm();
      setIndexName(' docs');
      setSeedUrls('https://a.example, https://b.example');
      setSitemapUrls('https://a.example/sitemap.xml');

      submitUrl();

      expect(getIndexNameInput()).toHaveValue(' docs');
      expect(getSeedUrlsInput()).toHaveValue('https://a.example, https://b.example');
      expect(getSitemapUrlsInput()).toHaveValue('https://a.example/sitemap.xml');
    });

    it('reports an invalid URL of the site along with invalid targets', () => {
      renderForm();
      openTargets();
      setIndexName('Docs');

      submitUrl('not a url');

      expect(screen.getByText(INVALID_URL_MESSAGE)).toBeInTheDocument();
      expect(getUrlInput()).toBeInvalid();
      expect(screen.getByText(INVALID_INDEX_NAME_MESSAGE)).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit valid targets with invalid limits or paths', () => {
      renderForm();
      setIndexName('docs');
      setSeedUrls('https://a.example');
      fireEvent.change(getMaxDepthInput(), { target: { value: '9' } });

      submitUrl();

      expect(onSubmit).not.toHaveBeenCalled();

      fireEvent.change(getMaxDepthInput(), { target: { value: '2' } });
      setIncludePaths('docs');
      fireEvent.click(getSubmitButton());

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("keeps showing the server's answer while a target is invalid", () => {
      renderForm({ errorMessage: SERVER_ERROR });
      openTargets();

      setIndexName('Docs');

      expect(screen.getByText(SERVER_ERROR)).toBeInTheDocument();
      expect(screen.getByText(INVALID_INDEX_NAME_MESSAGE)).toBeInTheDocument();
    });
  });
});
