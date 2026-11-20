/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, renderHook, screen } from '@testing-library/react';
import { createWebCrawl, renderWithWebCrawlerContext } from '../test_utils';
import type { CrawlTargetFields } from './web_crawl_targets';
import { WebCrawlTargets, useCrawlTargetFields } from './web_crawl_targets';

const INVALID_INDEX_NAME_MESSAGE =
  'Start with a lowercase letter or a digit, and use only lowercase letters, digits, dots, hyphens and underscores.';
const INVALID_URLS_MESSAGE = 'Enter up to 20 URLs that start with http:// or https://';

const createUrls = (count: number) =>
  Array.from({ length: count }, (_, index) => `https://example.com/p${index}`);
const createUrlOfLength = (length: number) => {
  const prefix = 'https://example.com/';
  return `${prefix}${'a'.repeat(length - prefix.length)}`;
};

describe('useCrawlTargetFields', () => {
  type Initial = Parameters<typeof useCrawlTargetFields>[0];

  const renderFields = (initial?: Initial) => renderHook(() => useCrawlTargetFields(initial));

  describe('initial values', () => {
    it('starts blank and valid, asking for the default index and no extra URLs', () => {
      const { result } = renderFields();

      expect(result.current.indexName).toBe('');
      expect(result.current.seedUrls).toBe('');
      expect(result.current.sitemapUrls).toBe('');
      expect(result.current.isIndexNameInvalid).toBe(false);
      expect(result.current.areSeedUrlsInvalid).toBe(false);
      expect(result.current.areSitemapUrlsInvalid).toBe(false);
      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets).toEqual({ seedUrls: [], sitemapUrls: [] });
      expect(result.current.targets.indexName).toBeUndefined();
    });

    it('starts from the targets it is given, with one URL per line', () => {
      const { result } = renderFields({
        indexName: 'docs',
        seedUrls: ['https://a.example', 'https://b.example/blog'],
        sitemapUrls: ['https://a.example/sitemap.xml', 'https://b.example/sitemap.xml'],
      });

      expect(result.current.indexName).toBe('docs');
      expect(result.current.seedUrls).toBe('https://a.example\nhttps://b.example/blog');
      expect(result.current.sitemapUrls).toBe(
        'https://a.example/sitemap.xml\nhttps://b.example/sitemap.xml'
      );
      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets).toEqual({
        indexName: 'docs',
        seedUrls: ['https://a.example', 'https://b.example/blog'],
        sitemapUrls: ['https://a.example/sitemap.xml', 'https://b.example/sitemap.xml'],
      });
    });

    it.each<[string, Initial, Partial<CrawlTargetFields['targets']>]>([
      ['an index name', { indexName: 'docs' }, { indexName: 'docs' }],
      ['start URLs', { seedUrls: ['https://a.example'] }, { seedUrls: ['https://a.example'] }],
      [
        'sitemap URLs',
        { sitemapUrls: ['https://a.example/sitemap.xml'] },
        { sitemapUrls: ['https://a.example/sitemap.xml'] },
      ],
      ['empty lists', { seedUrls: [], sitemapUrls: [] }, {}],
    ])('starts from just %s, leaving the rest blank', (_, initial, expected) => {
      const { result } = renderFields(initial);

      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets).toEqual({ seedUrls: [], sitemapUrls: [], ...expected });
    });

    it('starts from the targets of a crawl', () => {
      const crawl = createWebCrawl({
        indexName: 'web-crawl-docs',
        seedUrls: ['https://docs.example/guide', 'https://blog.example'],
        sitemapUrls: ['https://docs.example/sitemap-guide.xml'],
      });

      const { result } = renderFields(crawl);

      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets).toEqual({
        indexName: 'web-crawl-docs',
        seedUrls: ['https://docs.example/guide', 'https://blog.example'],
        sitemapUrls: ['https://docs.example/sitemap-guide.xml'],
      });
    });

    it('keeps the commas inside the URLs it is given', () => {
      const { result } = renderFields({
        seedUrls: ['https://a.example/x,y', 'https://b.example/?ids=1,2'],
        sitemapUrls: ['https://a.example/sitemap,1.xml'],
      });

      expect(result.current.targets.seedUrls).toEqual([
        'https://a.example/x,y',
        'https://b.example/?ids=1,2',
      ]);
      expect(result.current.targets.sitemapUrls).toEqual(['https://a.example/sitemap,1.xml']);
    });

    it('validates the targets it is given', () => {
      const { result } = renderFields({
        indexName: 'Docs',
        seedUrls: createUrls(21),
        sitemapUrls: ['ftp://a.example/sitemap.xml'],
      });

      expect(result.current.isIndexNameInvalid).toBe(true);
      expect(result.current.areSeedUrlsInvalid).toBe(true);
      expect(result.current.areSitemapUrlsInvalid).toBe(true);
      expect(result.current.isInvalid).toBe(true);
    });

    it('ignores later changes of the targets it was given', () => {
      const { result, rerender } = renderHook(
        ({ indexName }: { indexName: string }) => useCrawlTargetFields({ indexName }),
        { initialProps: { indexName: 'docs' } }
      );

      rerender({ indexName: 'blog' });

      expect(result.current.indexName).toBe('docs');
      expect(result.current.targets.indexName).toBe('docs');
    });
  });

  describe('index name', () => {
    const renderWithIndexName = (value: string) => {
      const rendered = renderFields();
      act(() => rendered.result.current.setIndexName(value));
      return rendered;
    };

    it.each(['docs', 'web-crawl-example-com', 'web_crawl.docs-2026', '0', '9lives', 'a.'])(
      'accepts %p',
      (value) => {
        const { result } = renderWithIndexName(value);

        expect(result.current.indexName).toBe(value);
        expect(result.current.isIndexNameInvalid).toBe(false);
        expect(result.current.isInvalid).toBe(false);
        expect(result.current.targets.indexName).toBe(value);
      }
    );

    it.each(['', ' ', '   ', '\t', ' \n '])('reads %p as the default index', (value) => {
      const { result } = renderWithIndexName(value);

      expect(result.current.indexName).toBe(value);
      expect(result.current.isIndexNameInvalid).toBe(false);
      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets.indexName).toBeUndefined();
      expect(result.current.targets).toEqual({ seedUrls: [], sitemapUrls: [] });
    });

    it('trims the whitespace around the name, keeping the text as typed', () => {
      const { result } = renderWithIndexName('  docs \t');

      expect(result.current.indexName).toBe('  docs \t');
      expect(result.current.isIndexNameInvalid).toBe(false);
      expect(result.current.targets.indexName).toBe('docs');
    });

    it.each([
      ['an uppercase letter', 'Docs'],
      ['an uppercase letter', 'web-Crawl'],
      ['a leading dot', '.docs'],
      ['a leading hyphen', '-docs'],
      ['a leading underscore', '_docs'],
      ['a space', 'my docs'],
      ['a wildcard', 'docs*'],
      ['a comma', 'docs,blog'],
      ['a slash', 'docs/blog'],
      ['a non-ASCII letter', 'dócs'],
    ])('rejects a name with %s: %p', (_, value) => {
      const { result } = renderWithIndexName(value);

      expect(result.current.isIndexNameInvalid).toBe(true);
      expect(result.current.isInvalid).toBe(true);
      expect(result.current.areSeedUrlsInvalid).toBe(false);
      expect(result.current.areSitemapUrlsInvalid).toBe(false);
    });

    it('rejects an invalid name even with whitespace around it', () => {
      const { result } = renderWithIndexName('  .docs  ');

      expect(result.current.isIndexNameInvalid).toBe(true);
    });

    it('accepts a name of 255 characters and rejects one of 256', () => {
      const longestName = 'a'.repeat(255);
      const { result } = renderWithIndexName(longestName);

      expect(result.current.isIndexNameInvalid).toBe(false);
      expect(result.current.targets.indexName).toBe(longestName);

      act(() => result.current.setIndexName(`${longestName}a`));

      expect(result.current.isIndexNameInvalid).toBe(true);
      expect(result.current.isInvalid).toBe(true);
    });

    it('measures the length of the trimmed name', () => {
      const { result } = renderWithIndexName(`  ${'a'.repeat(255)}  `);

      expect(result.current.isIndexNameInvalid).toBe(false);
      expect(result.current.targets.indexName).toHaveLength(255);
    });

    it('is valid again once the name is corrected or cleared', () => {
      const { result } = renderWithIndexName('Docs');
      expect(result.current.isInvalid).toBe(true);

      act(() => result.current.setIndexName('docs'));

      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets.indexName).toBe('docs');

      act(() => result.current.setIndexName('_docs'));
      expect(result.current.isInvalid).toBe(true);

      act(() => result.current.setIndexName(''));

      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets.indexName).toBeUndefined();
    });
  });

  describe.each([
    {
      name: 'start URLs',
      list: 'seedUrls' as const,
      setter: 'setSeedUrls' as const,
      invalid: 'areSeedUrlsInvalid' as const,
      otherList: 'sitemapUrls' as const,
      otherInvalid: 'areSitemapUrlsInvalid' as const,
    },
    {
      name: 'sitemap URLs',
      list: 'sitemapUrls' as const,
      setter: 'setSitemapUrls' as const,
      invalid: 'areSitemapUrlsInvalid' as const,
      otherList: 'seedUrls' as const,
      otherInvalid: 'areSeedUrlsInvalid' as const,
    },
  ])('$name', ({ list, setter, invalid, otherList, otherInvalid }) => {
    const renderWithUrls = (value: string) => {
      const rendered = renderFields();
      act(() => rendered.result.current[setter](value));
      return rendered;
    };

    it('reads a single URL, keeping the text as typed', () => {
      const { result } = renderWithUrls(' https://a.example/blog ');

      expect(result.current[list]).toBe(' https://a.example/blog ');
      expect(result.current[invalid]).toBe(false);
      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets[list]).toEqual(['https://a.example/blog']);
      expect(result.current.targets[otherList]).toEqual([]);
      expect(result.current.targets.indexName).toBeUndefined();
    });

    it.each(['', ' ', ' \t\n '])('reads %p as no URLs', (value) => {
      const { result } = renderWithUrls(value);

      expect(result.current[invalid]).toBe(false);
      expect(result.current.targets[list]).toEqual([]);
    });

    it('reads URLs separated by spaces, line breaks and commas, without blanks or duplicates', () => {
      const { result } = renderWithUrls(
        'https://a.example  https://b.example/docs,https://c.example\n https://a.example , http://d.example\t'
      );

      expect(result.current[invalid]).toBe(false);
      expect(result.current.targets[list]).toEqual([
        'https://a.example',
        'https://b.example/docs',
        'https://c.example',
        'http://d.example',
      ]);
    });

    it('keeps the commas inside a URL', () => {
      const { result } = renderWithUrls('https://a.example/x,y, https://b.example/?ids=1,2');

      expect(result.current[invalid]).toBe(false);
      expect(result.current.targets[list]).toEqual([
        'https://a.example/x,y',
        'https://b.example/?ids=1,2',
      ]);
    });

    it.each([
      'example.com',
      '/docs',
      'ftp://a.example',
      'file:///etc/hosts',
      'mailto:someone@example.com',
      'https://a.example ftp://b.example',
      'https://a.example, example.org',
    ])('rejects %p, and only that list', (value) => {
      const { result } = renderWithUrls(value);

      expect(result.current[invalid]).toBe(true);
      expect(result.current.isInvalid).toBe(true);
      expect(result.current[otherInvalid]).toBe(false);
      expect(result.current.isIndexNameInvalid).toBe(false);
    });

    it('accepts 20 URLs and rejects 21', () => {
      const { result } = renderWithUrls(createUrls(20).join(' '));

      expect(result.current[invalid]).toBe(false);
      expect(result.current.targets[list]).toEqual(createUrls(20));

      act(() => result.current[setter](createUrls(21).join(' ')));

      expect(result.current[invalid]).toBe(true);
      expect(result.current.isInvalid).toBe(true);
    });

    it('counts repeated URLs once against the limit of 20', () => {
      const urls = createUrls(20);
      const { result } = renderWithUrls([...urls, ...urls].join(', '));

      expect(result.current[invalid]).toBe(false);
      expect(result.current.targets[list]).toEqual(urls);
    });

    it('accepts a URL of 2048 characters and rejects one of 2049', () => {
      const longestUrl = createUrlOfLength(2048);
      const { result } = renderWithUrls(longestUrl);

      expect(result.current[invalid]).toBe(false);
      expect(result.current.targets[list]).toEqual([longestUrl]);

      act(() => result.current[setter](`${longestUrl}a`));

      expect(result.current[invalid]).toBe(true);
    });

    it('is valid again once the URLs are corrected or cleared', () => {
      const { result } = renderWithUrls('example.com');
      expect(result.current.isInvalid).toBe(true);

      act(() => result.current[setter]('https://example.com'));

      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets[list]).toEqual(['https://example.com']);

      act(() => result.current[setter]('ftp://example.com'));
      expect(result.current.isInvalid).toBe(true);

      act(() => result.current[setter](''));

      expect(result.current.isInvalid).toBe(false);
      expect(result.current.targets[list]).toEqual([]);
    });
  });

  it('holds the three fields independently of each other', () => {
    const { result } = renderFields();

    act(() => result.current.setIndexName('docs'));
    act(() => result.current.setSeedUrls('https://a.example'));
    act(() => result.current.setSitemapUrls('https://a.example/sitemap.xml'));

    expect(result.current.targets).toEqual({
      indexName: 'docs',
      seedUrls: ['https://a.example'],
      sitemapUrls: ['https://a.example/sitemap.xml'],
    });

    act(() => result.current.setSeedUrls(''));

    expect(result.current.targets).toEqual({
      indexName: 'docs',
      seedUrls: [],
      sitemapUrls: ['https://a.example/sitemap.xml'],
    });
  });

  it('stays invalid until every invalid field is corrected', () => {
    const { result } = renderFields();
    act(() => result.current.setIndexName('Docs'));
    act(() => result.current.setSeedUrls('a.example'));
    act(() => result.current.setSitemapUrls('sitemap.xml'));
    expect(result.current.isInvalid).toBe(true);

    act(() => result.current.setIndexName('docs'));
    expect(result.current.isInvalid).toBe(true);

    act(() => result.current.setSeedUrls('https://a.example'));
    expect(result.current.isInvalid).toBe(true);

    act(() => result.current.setSitemapUrls('https://a.example/sitemap.xml'));
    expect(result.current.isInvalid).toBe(false);
  });

  it('allows the same URL as a start URL and as a sitemap URL', () => {
    const { result } = renderFields();

    act(() => result.current.setSeedUrls('https://a.example/sitemap.xml'));
    act(() => result.current.setSitemapUrls('https://a.example/sitemap.xml'));

    expect(result.current.isInvalid).toBe(false);
    expect(result.current.targets.seedUrls).toEqual(['https://a.example/sitemap.xml']);
    expect(result.current.targets.sitemapUrls).toEqual(['https://a.example/sitemap.xml']);
  });
});

describe('WebCrawlTargets', () => {
  const setIndexName = jest.fn();
  const setSeedUrls = jest.fn();
  const setSitemapUrls = jest.fn();

  const createFields = (overrides: Partial<CrawlTargetFields> = {}): CrawlTargetFields => ({
    indexName: '',
    seedUrls: '',
    sitemapUrls: '',
    setIndexName,
    setSeedUrls,
    setSitemapUrls,
    isIndexNameInvalid: false,
    areSeedUrlsInvalid: false,
    areSitemapUrlsInvalid: false,
    isInvalid: false,
    targets: { seedUrls: [], sitemapUrls: [] },
    ...overrides,
  });

  const renderTargets = (
    fields: Partial<CrawlTargetFields> = {},
    props: { isDisabled?: boolean; compressed?: boolean } = {}
  ) => renderWithWebCrawlerContext(<WebCrawlTargets fields={createFields(fields)} {...props} />);

  const Harness = ({ initial }: { initial?: Parameters<typeof useCrawlTargetFields>[0] }) => {
    const fields = useCrawlTargetFields(initial);

    return (
      <>
        <WebCrawlTargets fields={fields} />
        <output data-test-subj="targets">{JSON.stringify(fields.targets)}</output>
        <output data-test-subj="isInvalid">{String(fields.isInvalid)}</output>
      </>
    );
  };

  // The ids EUI generates collide in Jest, which garbles the accessible name of the toggle.
  const getToggle = () => {
    const toggle = screen.getByText('Index, start URLs and sitemaps').closest('button');
    if (!toggle) {
      throw new Error('No toggle for the crawl targets');
    }
    return toggle;
  };
  const getIndexNameInput = () => screen.getByTestId('webCrawlIndexName');
  const getSeedUrlsInput = () => screen.getByTestId('webCrawlSeedUrls');
  const getSitemapUrlsInput = () => screen.getByTestId('webCrawlSitemapUrls');
  const getInputs = () => [getIndexNameInput(), getSeedUrlsInput(), getSitemapUrlsInput()];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('accordion', () => {
    it('is closed to start with, keeping its inputs out of sight', () => {
      renderTargets();

      expect(screen.getByTestId('webCrawlTargets')).toContainElement(getToggle());
      expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
      for (const input of getInputs()) {
        expect(screen.getByTestId('webCrawlTargets')).toContainElement(input);
        expect(input).not.toBeVisible();
      }
    });

    it('shows its inputs once opened and hides them again once closed', () => {
      renderTargets();

      fireEvent.click(getToggle());

      expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
      for (const input of getInputs()) {
        expect(input).toBeVisible();
      }

      fireEvent.click(getToggle());

      expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
      for (const input of getInputs()) {
        expect(input).not.toBeVisible();
      }
    });

    it('keeps what was typed while it is closed', () => {
      renderTargets({ indexName: 'docs', seedUrls: 'https://a.example' });
      fireEvent.click(getToggle());
      fireEvent.click(getToggle());

      expect(getIndexNameInput()).toHaveValue('docs');
      expect(getSeedUrlsInput()).toHaveValue('https://a.example');
    });
  });

  describe('fields', () => {
    it('renders three enabled, valid text inputs labeled by what they take', () => {
      renderTargets();
      fireEvent.click(getToggle());

      expect(screen.getByText('Index')).toBeVisible();
      expect(screen.getByText('More start URLs')).toBeVisible();
      expect(screen.getByText('Sitemap URLs')).toBeVisible();
      expect(screen.getAllByRole('textbox')).toEqual(getInputs());
      for (const input of getInputs()) {
        expect(input).toBeEnabled();
        expect(input).not.toBeInvalid();
        expect(input).toHaveValue('');
      }
      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
    });

    it('gives every input an accessible name', () => {
      renderTargets();
      fireEvent.click(getToggle());

      expect(screen.getByRole('textbox', { name: 'Index' })).toBe(getIndexNameInput());
      expect(screen.getByRole('textbox', { name: 'More start URLs' })).toBe(getSeedUrlsInput());
      expect(screen.getByRole('textbox', { name: 'Sitemap URLs' })).toBe(getSitemapUrlsInput());
    });

    it('explains what each input is for', () => {
      renderTargets();
      fireEvent.click(getToggle());

      expect(
        screen.getByText(
          'Leave empty to use the index named after the site. Crawl several sites into one index by giving them the same name.'
        )
      ).toBeVisible();
      expect(
        screen.getByText(
          'Other pages to start from, one per line. They can be on other sites, which are then crawled too.'
        )
      ).toBeVisible();
      expect(
        screen.getByText('Sitemaps to read besides the ones the sites declare, one per line.')
      ).toBeVisible();
    });

    it('shows an example of each value while it is empty', () => {
      renderTargets();

      expect(getIndexNameInput()).toHaveAttribute('placeholder', 'web-crawl-docs');
      expect(getSeedUrlsInput()).toHaveAttribute('placeholder', 'https://docs.example.com');
      expect(getSitemapUrlsInput()).toHaveAttribute(
        'placeholder',
        'https://example.com/sitemap-docs.xml'
      );
    });

    it('shows the text it was given, as typed', () => {
      renderTargets({
        indexName: ' Docs ',
        seedUrls: 'https://a.example,  https://b.example ',
        sitemapUrls: ' https://a.example/sitemap.xml',
      });

      expect(getIndexNameInput()).toHaveValue(' Docs ');
      expect(getSeedUrlsInput()).toHaveValue('https://a.example,  https://b.example ');
      expect(getSitemapUrlsInput()).toHaveValue(' https://a.example/sitemap.xml');
    });

    it('reports the text typed into the index, and nothing for the other inputs', () => {
      renderTargets();

      fireEvent.change(getIndexNameInput(), { target: { value: ' My Docs ' } });

      expect(setIndexName).toHaveBeenCalledTimes(1);
      expect(setIndexName).toHaveBeenCalledWith(' My Docs ');
      expect(setSeedUrls).not.toHaveBeenCalled();
      expect(setSitemapUrls).not.toHaveBeenCalled();
    });

    it('reports the text typed into the start URLs, and nothing for the other inputs', () => {
      renderTargets();

      fireEvent.change(getSeedUrlsInput(), { target: { value: 'https://a.example, b ' } });

      expect(setSeedUrls).toHaveBeenCalledTimes(1);
      expect(setSeedUrls).toHaveBeenCalledWith('https://a.example, b ');
      expect(setIndexName).not.toHaveBeenCalled();
      expect(setSitemapUrls).not.toHaveBeenCalled();
    });

    it('reports the text typed into the sitemap URLs, and nothing for the other inputs', () => {
      renderTargets();

      fireEvent.change(getSitemapUrlsInput(), {
        target: { value: 'https://a.example/sitemap.xml' },
      });

      expect(setSitemapUrls).toHaveBeenCalledTimes(1);
      expect(setSitemapUrls).toHaveBeenCalledWith('https://a.example/sitemap.xml');
      expect(setIndexName).not.toHaveBeenCalled();
      expect(setSeedUrls).not.toHaveBeenCalled();
    });

    it('reports a cleared input as empty text', () => {
      renderTargets({ indexName: 'docs', seedUrls: 'https://a.example' });

      fireEvent.change(getIndexNameInput(), { target: { value: '' } });
      fireEvent.change(getSeedUrlsInput(), { target: { value: '' } });

      expect(setIndexName).toHaveBeenCalledWith('');
      expect(setSeedUrls).toHaveBeenCalledWith('');
    });

    it('is controlled: it keeps showing the given text until its fields change', () => {
      renderTargets({ indexName: 'docs' });

      fireEvent.change(getIndexNameInput(), { target: { value: 'blog' } });

      expect(getIndexNameInput()).toHaveValue('docs');
    });

    it('disables every input', () => {
      renderTargets({}, { isDisabled: true });

      for (const input of getInputs()) {
        expect(input).toBeDisabled();
      }
    });

    it('can still be opened while its inputs are disabled', () => {
      renderTargets({}, { isDisabled: true });

      fireEvent.click(getToggle());

      expect(getToggle()).toHaveAttribute('aria-expanded', 'true');
      expect(getIndexNameInput()).toBeVisible();
    });

    it.each([
      [true, true],
      [false, false],
    ])('renders compressed inputs when compressed is %p', (compressed, isCompressed) => {
      renderTargets({}, { compressed });

      for (const input of getInputs()) {
        expect(/compressed/.test(input.className)).toBe(isCompressed);
      }
    });
  });

  describe('validation', () => {
    it('marks only the index invalid and says what an index name looks like', () => {
      renderTargets({ isIndexNameInvalid: true, isInvalid: true });
      fireEvent.click(getToggle());

      expect(screen.getByText(INVALID_INDEX_NAME_MESSAGE)).toBeVisible();
      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      expect(getIndexNameInput()).toBeInvalid();
      expect(getSeedUrlsInput()).not.toBeInvalid();
      expect(getSitemapUrlsInput()).not.toBeInvalid();
    });

    it('marks only the start URLs invalid and says how many URLs of what kind they take', () => {
      renderTargets({ areSeedUrlsInvalid: true, isInvalid: true });
      fireEvent.click(getToggle());

      expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(1);
      expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeVisible();
      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(getSeedUrlsInput()).toBeInvalid();
      expect(getIndexNameInput()).not.toBeInvalid();
      expect(getSitemapUrlsInput()).not.toBeInvalid();
    });

    it('marks only the sitemap URLs invalid and says how many URLs of what kind they take', () => {
      renderTargets({ areSitemapUrlsInvalid: true, isInvalid: true });
      fireEvent.click(getToggle());

      expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(1);
      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(getSitemapUrlsInput()).toBeInvalid();
      expect(getIndexNameInput()).not.toBeInvalid();
      expect(getSeedUrlsInput()).not.toBeInvalid();
    });

    it('shows an error under each invalid input', () => {
      renderTargets({
        isIndexNameInvalid: true,
        areSeedUrlsInvalid: true,
        areSitemapUrlsInvalid: true,
        isInvalid: true,
      });
      fireEvent.click(getToggle());

      expect(screen.getAllByText(INVALID_INDEX_NAME_MESSAGE)).toHaveLength(1);
      expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(2);
      for (const input of getInputs()) {
        expect(input).toBeInvalid();
      }
    });

    it('marks nothing invalid on the strength of isInvalid alone', () => {
      renderTargets({ isInvalid: true });

      for (const input of getInputs()) {
        expect(input).not.toBeInvalid();
      }
      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
    });
  });

  describe('with the fields of useCrawlTargetFields', () => {
    const renderHarness = (initial?: Parameters<typeof useCrawlTargetFields>[0]) => {
      const rendered = renderWithWebCrawlerContext(<Harness initial={initial} />);
      fireEvent.click(getToggle());
      return rendered;
    };

    const getTargets = () => JSON.parse(screen.getByTestId('targets').textContent ?? '');
    const type = (input: HTMLElement, value: string) =>
      fireEvent.change(input, { target: { value } });

    it('shows what was typed and reports what it amounts to', () => {
      renderHarness();

      type(getIndexNameInput(), ' docs ');
      type(getSeedUrlsInput(), 'https://a.example, https://b.example https://a.example');
      type(getSitemapUrlsInput(), 'https://a.example/sitemap.xml');

      expect(getIndexNameInput()).toHaveValue(' docs ');
      expect(getSeedUrlsInput()).toHaveValue(
        'https://a.example, https://b.example https://a.example'
      );
      expect(getSitemapUrlsInput()).toHaveValue('https://a.example/sitemap.xml');
      expect(screen.getByTestId('isInvalid')).toHaveTextContent('false');
      expect(getTargets()).toEqual({
        indexName: 'docs',
        seedUrls: ['https://a.example', 'https://b.example'],
        sitemapUrls: ['https://a.example/sitemap.xml'],
      });
    });

    it('shows the targets it starts from', () => {
      renderHarness({
        indexName: 'web-crawl-docs',
        seedUrls: ['https://a.example', 'https://b.example'],
        sitemapUrls: ['https://a.example/sitemap.xml'],
      });

      expect(getIndexNameInput()).toHaveValue('web-crawl-docs');
      expect(getSeedUrlsInput()).toHaveValue('https://a.example\nhttps://b.example');
      expect(getSitemapUrlsInput()).toHaveValue('https://a.example/sitemap.xml');
      expect(screen.getByTestId('isInvalid')).toHaveTextContent('false');
    });

    it.each(['Docs', '.docs', '-docs', '_docs', 'my docs', 'a'.repeat(256)])(
      'shows the index error for a name of %p and clears it once corrected',
      (value) => {
        renderHarness();

        type(getIndexNameInput(), value);

        expect(screen.getByText(INVALID_INDEX_NAME_MESSAGE)).toBeVisible();
        expect(getIndexNameInput()).toBeInvalid();
        expect(screen.getByTestId('isInvalid')).toHaveTextContent('true');

        type(getIndexNameInput(), 'docs');

        expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
        expect(getIndexNameInput()).not.toBeInvalid();
        expect(screen.getByTestId('isInvalid')).toHaveTextContent('false');
      }
    );

    it('shows no index error for a blank name or one with whitespace around it', () => {
      renderHarness();

      type(getIndexNameInput(), '   ');

      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(getTargets()).toEqual({ seedUrls: [], sitemapUrls: [] });

      type(getIndexNameInput(), '  docs  ');

      expect(screen.queryByText(INVALID_INDEX_NAME_MESSAGE)).not.toBeInTheDocument();
      expect(getTargets()).toEqual({ indexName: 'docs', seedUrls: [], sitemapUrls: [] });
    });

    it.each([
      ['webCrawlSeedUrls', 'webCrawlSitemapUrls'],
      ['webCrawlSitemapUrls', 'webCrawlSeedUrls'],
    ])('shows the URL error under %s only, for 21 URLs but not for 20', (testSubj, otherSubj) => {
      renderHarness();

      type(screen.getByTestId(testSubj), createUrls(21).join(' '));

      expect(screen.getAllByText(INVALID_URLS_MESSAGE)).toHaveLength(1);
      expect(screen.getByTestId(testSubj)).toBeInvalid();
      expect(screen.getByTestId(otherSubj)).not.toBeInvalid();
      expect(screen.getByTestId('isInvalid')).toHaveTextContent('true');

      type(screen.getByTestId(testSubj), createUrls(20).join(' '));

      expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
      expect(screen.getByTestId(testSubj)).not.toBeInvalid();
      expect(screen.getByTestId('isInvalid')).toHaveTextContent('false');
    });

    it.each(['webCrawlSeedUrls', 'webCrawlSitemapUrls'])(
      'shows the URL error under %s for a URL of 2049 characters but not for one of 2048',
      (testSubj) => {
        renderHarness();

        type(screen.getByTestId(testSubj), createUrlOfLength(2049));

        expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeVisible();
        expect(screen.getByTestId(testSubj)).toBeInvalid();

        type(screen.getByTestId(testSubj), createUrlOfLength(2048));

        expect(screen.queryByText(INVALID_URLS_MESSAGE)).not.toBeInTheDocument();
        expect(screen.getByTestId(testSubj)).not.toBeInvalid();
      }
    );

    it.each(['example.com', 'ftp://a.example', 'https://a.example file:///etc/hosts'])(
      'shows the URL error for start URLs of %p',
      (value) => {
        renderHarness();

        type(getSeedUrlsInput(), value);

        expect(screen.getByText(INVALID_URLS_MESSAGE)).toBeVisible();
        expect(getSeedUrlsInput()).toBeInvalid();
      }
    );
  });
});

describe('WebCrawlTargets that cannot be hidden while invalid', () => {
  const Harness = () => <WebCrawlTargets fields={useCrawlTargetFields()} />;
  const getToggle = () => screen.getByText('Index, start URLs and sitemaps');

  it('opens, and stays open, while a field is invalid', () => {
    renderWithWebCrawlerContext(<Harness />);
    fireEvent.click(getToggle());
    fireEvent.change(screen.getByTestId('webCrawlIndexName'), { target: { value: 'Docs' } });

    fireEvent.click(getToggle());

    expect(screen.getByTestId('webCrawlIndexName')).toBeVisible();

    fireEvent.change(screen.getByTestId('webCrawlIndexName'), { target: { value: 'docs' } });
    fireEvent.click(getToggle());

    expect(screen.getByTestId('webCrawlIndexName')).not.toBeVisible();
  });

  it('keeps one URL per line in the URL inputs', () => {
    renderWithWebCrawlerContext(<Harness />);
    fireEvent.click(getToggle());

    fireEvent.change(screen.getByTestId('webCrawlSeedUrls'), {
      target: { value: 'https://a.example\nhttps://b.example' },
    });

    expect(screen.getByTestId('webCrawlSeedUrls')).toHaveValue(
      'https://a.example\nhttps://b.example'
    );
  });
});
