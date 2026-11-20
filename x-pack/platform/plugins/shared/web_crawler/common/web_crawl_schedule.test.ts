/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import type { WebCrawlScheduleRequest } from './types';
import { WEB_CRAWL_WORKFLOW_TAG, buildWebCrawlWorkflowYaml } from './web_crawl_schedule';
import { WEB_CRAWL_STEP_ID, webCrawlStepInputSchema } from './web_crawl_step';

const CRAWL_URL = 'https://www.elastic.co/docs';

const REQUEST: WebCrawlScheduleRequest = {
  url: CRAWL_URL,
  maxDepth: 3,
  maxDocuments: 250,
  every: 1,
  unit: 'd',
};

interface ParsedWorkflow {
  version: string;
  name: string;
  description: string;
  enabled: boolean;
  tags: string[];
  triggers: Array<{ type: string; with?: Record<string, unknown> }>;
  steps: Array<{ name: string; type: string; with: Record<string, unknown> }>;
}

const parse = (yaml: string): ParsedWorkflow => {
  const result = parseYamlToJSONWithoutValidation(yaml);
  if (!result.success) {
    throw result.error;
  }
  expect(result.document.errors).toEqual([]);
  return result.json as unknown as ParsedWorkflow;
};

const build = (overrides: Partial<WebCrawlScheduleRequest> = {}): ParsedWorkflow =>
  parse(buildWebCrawlWorkflowYaml({ ...REQUEST, ...overrides }));

describe('buildWebCrawlWorkflowYaml', () => {
  it('builds an enabled workflow that crawls the site on a schedule and on demand', () => {
    expect(build()).toEqual({
      version: '1',
      name: `Web crawl: ${CRAWL_URL}`,
      description: `Crawls ${CRAWL_URL} every 1d. Created from the web crawls page.`,
      enabled: true,
      tags: ['web-crawl'],
      triggers: [{ type: 'scheduled', with: { every: '1d' } }, { type: 'manual' }],
      steps: [
        {
          name: 'crawl',
          type: 'webCrawl.run',
          with: { url: CRAWL_URL, max_depth: 3, max_documents: 250 },
        },
      ],
    });
  });

  it('tags the workflow so the crawl page can list it', () => {
    expect(build().tags).toEqual([WEB_CRAWL_WORKFLOW_TAG]);
  });

  it('runs the crawl step', () => {
    const [step] = build().steps;

    expect(step.type).toBe(WEB_CRAWL_STEP_ID);
    expect(webCrawlStepInputSchema.safeParse(step.with).success).toBe(true);
  });

  it.each([
    [1, 'h', '1h'],
    [12, 'h', '12h'],
    [7, 'd', '7d'],
  ] as const)('repeats every %i%s', (every, unit, expected) => {
    const { triggers, description } = build({ every, unit });

    expect(triggers[0]).toEqual({ type: 'scheduled', with: { every: expected } });
    expect(description).toContain(`every ${expected}.`);
  });

  it('leaves out the limits that were not requested', () => {
    const [{ with: input }] = build({ maxDepth: undefined, maxDocuments: undefined }).steps;

    expect(input).toEqual({ url: CRAWL_URL });
    expect(buildWebCrawlWorkflowYaml({ url: CRAWL_URL, every: 1, unit: 'd' })).not.toMatch(
      /max_depth|max_documents/
    );
  });

  it('leaves out each limit independently', () => {
    expect(build({ maxDocuments: undefined }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
    });
    expect(build({ maxDepth: undefined }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_documents: 250,
    });
  });

  it('keeps a depth of zero', () => {
    expect(build({ maxDepth: 0 }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 0,
      max_documents: 250,
    });
  });

  it('writes the paths to include and to exclude', () => {
    const [{ with: input }] = build({
      includePaths: ['/docs', '/blog'],
      excludePaths: ['/docs/internal'],
    }).steps;

    expect(input).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
      include_paths: ['/docs', '/blog'],
      exclude_paths: ['/docs/internal'],
    });
    expect(webCrawlStepInputSchema.safeParse(input).success).toBe(true);
  });

  it('writes each list of paths independently', () => {
    expect(build({ includePaths: ['/docs'] }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
      include_paths: ['/docs'],
    });
    expect(build({ excludePaths: ['/blog'] }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
      exclude_paths: ['/blog'],
    });
    expect(build({ includePaths: ['/docs'], excludePaths: [] }).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
      include_paths: ['/docs'],
    });
  });

  it.each([
    ['empty', []],
    ['not given', undefined],
  ])('leaves out the paths when they are %s', (_, paths) => {
    const yaml = buildWebCrawlWorkflowYaml({
      ...REQUEST,
      includePaths: paths,
      excludePaths: paths,
    });

    expect(yaml).not.toMatch(/include_paths|exclude_paths/);
    expect(parse(yaml).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
    });
  });

  it('writes the paths without the limits that were not requested', () => {
    const [{ with: input }] = build({
      maxDepth: undefined,
      maxDocuments: undefined,
      excludePaths: ['/blog'],
    }).steps;

    expect(input).toEqual({ url: CRAWL_URL, exclude_paths: ['/blog'] });
  });

  it('keeps the paths in the order given', () => {
    const includePaths = ['/c', '/a', '/b'];

    expect(build({ includePaths }).steps[0].with.include_paths).toEqual(includePaths);
  });

  it.each([
    '/a: b',
    '/#fragment',
    '/[1,2]',
    '/{{ inputs.secret }}',
    `/it's "quoted"`,
    '/a | b > c',
    '/- injected: true',
    '/docs\nsteps: []',
    '/ trailing ',
    '/パス',
    '/*',
    '/123',
  ])('round-trips the path %p', (path) => {
    const { steps, triggers } = build({ includePaths: [path, '/docs'], excludePaths: [path] });

    expect(steps).toHaveLength(1);
    expect(triggers).toHaveLength(2);
    expect(steps[0].with.include_paths).toEqual([path, '/docs']);
    expect(steps[0].with.exclude_paths).toEqual([path]);
  });

  it('writes the index, the other start URLs and the sitemap URLs', () => {
    const [{ with: input }] = build({
      indexName: 'product-docs',
      seedUrls: ['https://www.elastic.co/blog', 'https://example.org/'],
      sitemapUrls: ['https://www.elastic.co/sitemap.xml'],
    }).steps;

    expect(input).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
      index_name: 'product-docs',
      seed_urls: ['https://www.elastic.co/blog', 'https://example.org/'],
      sitemap_urls: ['https://www.elastic.co/sitemap.xml'],
    });
    expect(webCrawlStepInputSchema.safeParse(input).success).toBe(true);
  });

  it('writes the index, the start URLs and the sitemap URLs independently', () => {
    const limits = { url: CRAWL_URL, max_depth: 3, max_documents: 250 };

    expect(build({ indexName: 'product-docs' }).steps[0].with).toEqual({
      ...limits,
      index_name: 'product-docs',
    });
    expect(build({ seedUrls: ['https://example.org/'] }).steps[0].with).toEqual({
      ...limits,
      seed_urls: ['https://example.org/'],
    });
    expect(build({ sitemapUrls: ['https://example.org/sitemap.xml'] }).steps[0].with).toEqual({
      ...limits,
      sitemap_urls: ['https://example.org/sitemap.xml'],
    });
    expect(
      build({ indexName: 'product-docs', seedUrls: [], sitemapUrls: undefined }).steps[0].with
    ).toEqual({ ...limits, index_name: 'product-docs' });
  });

  it.each([
    ['empty', []],
    ['not given', undefined],
  ])('leaves out the start URLs and the sitemap URLs when they are %s', (_, urls) => {
    const yaml = buildWebCrawlWorkflowYaml({ ...REQUEST, seedUrls: urls, sitemapUrls: urls });

    expect(yaml).not.toMatch(/seed_urls|sitemap_urls/);
    expect(parse(yaml).steps[0].with).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
    });
  });

  it('leaves out the index when it is not given, so the crawl names it after the host', () => {
    expect(buildWebCrawlWorkflowYaml(REQUEST)).not.toMatch(/index_name/);
    expect(buildWebCrawlWorkflowYaml({ ...REQUEST, indexName: undefined })).not.toMatch(
      /index_name/
    );
  });

  it('writes everything a crawl can be given, in a step the workflow accepts', () => {
    const [{ with: input }] = build({
      includePaths: ['/docs'],
      excludePaths: ['/docs/internal'],
      indexName: 'product-docs',
      seedUrls: ['https://example.org/'],
      sitemapUrls: ['https://example.org/sitemap.xml'],
    }).steps;

    expect(input).toEqual({
      url: CRAWL_URL,
      max_depth: 3,
      max_documents: 250,
      include_paths: ['/docs'],
      exclude_paths: ['/docs/internal'],
      index_name: 'product-docs',
      seed_urls: ['https://example.org/'],
      sitemap_urls: ['https://example.org/sitemap.xml'],
    });
    expect(webCrawlStepInputSchema.safeParse(input).success).toBe(true);
  });

  it('writes them without the limits and paths that were not requested', () => {
    const [{ with: input }] = build({
      maxDepth: undefined,
      maxDocuments: undefined,
      indexName: 'product-docs',
      sitemapUrls: ['https://example.org/sitemap.xml'],
    }).steps;

    expect(input).toEqual({
      url: CRAWL_URL,
      index_name: 'product-docs',
      sitemap_urls: ['https://example.org/sitemap.xml'],
    });
  });

  it('keeps the start URLs and the sitemap URLs in the order given, duplicates included', () => {
    const urls = ['https://c.example.org/', 'https://a.example.org/', 'https://c.example.org/'];

    const [{ with: input }] = build({ seedUrls: urls, sitemapUrls: [...urls].reverse() }).steps;

    expect(input.seed_urls).toEqual(urls);
    expect(input.sitemap_urls).toEqual([...urls].reverse());
  });

  it('names and describes the workflow after the URL alone, whatever else the crawl starts from', () => {
    const { name, description } = build({
      indexName: 'product-docs',
      seedUrls: ['https://example.org/'],
      sitemapUrls: ['https://example.org/sitemap.xml'],
    });

    expect(name).toBe(`Web crawl: ${CRAWL_URL}`);
    expect(description).toBe(`Crawls ${CRAWL_URL} every 1d. Created from the web crawls page.`);
  });

  it.each([
    'https://example.com/a: b',
    'https://example.com/?q=[1,2]&filter={a:b}',
    `https://example.com/it's "quoted"`,
    'https://example.com/{{ inputs.secret }}',
    'https://example.com/a | b > c',
    'https://example.com/\nsteps: []',
    'https://example.com/- injected: true',
    'https://例え.jp/パス',
    '- not a url',
    '# comment',
  ])('round-trips the start URL and the sitemap URL %p', (url) => {
    const { steps, triggers } = build({
      seedUrls: [url, 'https://example.org/'],
      sitemapUrls: [url],
    });

    expect(steps).toHaveLength(1);
    expect(triggers).toHaveLength(2);
    expect(steps[0].with.seed_urls).toEqual([url, 'https://example.org/']);
    expect(steps[0].with.sitemap_urls).toEqual([url]);
  });

  it.each([
    'product-docs',
    'docs.2026-01_v2',
    '123',
    '0',
    'true',
    'null',
    'yes',
    '1e3',
    '0x1f',
    '2026-01-01',
    'a: b',
    '- docs',
    '{{ inputs.index }}',
    'docs\nsteps: []',
    ' padded ',
  ])('writes the index name %p as that string', (indexName) => {
    const { steps, triggers } = build({ indexName });

    expect(steps).toHaveLength(1);
    expect(triggers).toHaveLength(2);
    expect(steps[0].with.index_name).toBe(indexName);
  });

  it('writes the limits as numbers', () => {
    const [{ with: input }] = build().steps;

    expect(typeof input.max_depth).toBe('number');
    expect(typeof input.max_documents).toBe('number');
  });

  it.each([
    'https://example.com/a: b',
    'https://example.com/#fragment',
    'https://example.com/?q=[1,2]&filter={a:b}',
    'https://example.com/path?x=1&y=*&z=!important',
    `https://example.com/it's "quoted"`,
    'https://example.com/{{ inputs.secret }}',
    'https://example.com/a | b > c',
    'https://example.com/%20%0A- injected: true',
    'https://example.com/\nsteps: []',
    'https://example.com/ trailing ',
    'https://例え.jp/パス',
  ])('round-trips the URL %p', (url) => {
    const { name, description, steps, triggers } = build({ url });

    expect(steps).toHaveLength(1);
    expect(triggers).toHaveLength(2);
    expect(steps[0].with.url).toBe(url);
    expect(name).toBe(`Web crawl: ${url}`);
    expect(description).toBe(`Crawls ${url} every 1d. Created from the web crawls page.`);
  });
});
