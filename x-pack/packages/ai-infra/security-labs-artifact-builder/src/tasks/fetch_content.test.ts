/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import type { TaskConfig } from '../types';
import type { ContentstackEntry } from './contentstack_entry';
import {
  assertAllowedContentstackHost,
  CONTENTSTACK_PAGE_SIZE,
  fetchContent,
} from './fetch_content';

const createConfig = (overrides: Partial<TaskConfig> = {}): TaskConfig => ({
  version: '2026.11.11-120000',
  buildFolder: '/tmp/build',
  targetFolder: '/tmp/target',
  embeddingClusterUrl: 'http://localhost:9200',
  embeddingClusterUsername: 'elastic',
  embeddingClusterPassword: 'changeme',
  contentstackHost: 'cdn.contentstack.io',
  contentstackApiKey: 'blt-stack-key',
  contentstackDeliveryToken: 'cs-delivery-token',
  contentstackEnvironment: 'production',
  contentstackLocale: 'en-us',
  contentstackContentTypes: ['threat_command'],
  inferenceId: '.elser-2-elasticsearch',
  ...overrides,
});

const createEntry = (index: number): ContentstackEntry => ({
  uid: `blt${index}`,
  title_l10n: `Article ${index}`,
  url: `/security-labs/threat-command/article-${index}`,
  main_content: { markdown_l10n: `Body ${index}` },
});

const jsonResponse = (body: object, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('assertAllowedContentstackHost', () => {
  it.each([
    'cdn.contentstack.io',
    'eu-cdn.contentstack.com',
    'azure-na-cdn.contentstack.com',
    'gcp-na-cdn.contentstack.com',
  ])('allows the Contentstack delivery host [%s]', (host) => {
    expect(() => assertAllowedContentstackHost(host)).not.toThrow();
  });

  it.each([
    'api.contentstack.io',
    'cdn.contentstack.io.example.com',
    'https://cdn.contentstack.io',
    'example.com',
  ])('rejects [%s]', (host) => {
    expect(() => assertAllowedContentstackHost(host)).toThrow(/Refusing to fetch/);
  });
});

describe('fetchContent', () => {
  const log = new ToolingLog();
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('requests published entries with the stack API key and delivery token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ entries: [createEntry(1)], count: 1 }));

    const documents = await fetchContent({ config: createConfig(), log });

    expect(documents.map(({ slug }) => slug)).toEqual(['threat-command/article-1']);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe('https://cdn.contentstack.io');
    expect(url.pathname).toBe('/v3/content_types/threat_command/entries');
    expect(url.searchParams.get('environment')).toBe('production');
    expect(url.searchParams.get('locale')).toBe('en-us');
    expect(url.searchParams.get('include_count')).toBe('true');
    expect(url.searchParams.getAll('include[]')).toEqual(['author', 'categories']);
    expect(url.searchParams.has('query')).toBe(false);
    expect(init.headers).toEqual({ api_key: 'blt-stack-key', access_token: 'cs-delivery-token' });
    expect(init.redirect).toBe('manual');
  });

  it('fails on a redirect instead of following it with the credentials', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 301,
        statusText: 'Moved Permanently',
        headers: { Location: 'https://example.com/v3/content_types/threat_command/entries' },
      })
    );

    await expect(fetchContent({ config: createConfig(), log })).rejects.toThrow(
      'Contentstack request for content type [threat_command] failed with HTTP 301: Moved Permanently'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('scopes the shared blog_v3 content type to Security Labs posts', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ entries: [], count: 0 }));

    await fetchContent({ config: createConfig({ contentstackContentTypes: ['blog_v3'] }), log });

    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(JSON.parse(url.searchParams.get('query') ?? '')).toEqual({
      blog_sources: { $in_query: { title: 'Security Labs' } },
    });
  });

  it('pages through every entry of each content type', async () => {
    const firstPage = Array.from({ length: CONTENTSTACK_PAGE_SIZE }, (_, i) => createEntry(i));
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ entries: firstPage, count: CONTENTSTACK_PAGE_SIZE + 1 })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          entries: [createEntry(CONTENTSTACK_PAGE_SIZE)],
          count: CONTENTSTACK_PAGE_SIZE + 1,
        })
      )
      .mockResolvedValueOnce(jsonResponse({ entries: [createEntry(500)], count: 1 }));

    const documents = await fetchContent({
      config: createConfig({ contentstackContentTypes: ['threat_command', 'reports'] }),
      log,
    });

    expect(documents).toHaveLength(CONTENTSTACK_PAGE_SIZE + 2);
    const requested = fetchMock.mock.calls.map(([url]) => {
      const { pathname, searchParams } = url as URL;
      return `${pathname}?skip=${searchParams.get('skip')}`;
    });
    expect(requested).toEqual([
      '/v3/content_types/threat_command/entries?skip=0',
      `/v3/content_types/threat_command/entries?skip=${CONTENTSTACK_PAGE_SIZE}`,
      '/v3/content_types/reports/entries?skip=0',
    ]);
  });

  it('skips entries that cannot be mapped to a document', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [createEntry(1), { uid: 'blt-empty', title_l10n: 'No body' }],
        count: 2,
      })
    );

    const documents = await fetchContent({ config: createConfig(), log });

    expect(documents.map(({ slug }) => slug)).toEqual(['threat-command/article-1']);
  });

  it('surfaces Contentstack API errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error_message: 'The Delivery Token is invalid.', error_code: 109 }, 412)
    );

    await expect(fetchContent({ config: createConfig(), log })).rejects.toThrow(
      'Contentstack request for content type [threat_command] failed with HTTP 412: The Delivery Token is invalid.'
    );
  });

  it('requires a stack API key', async () => {
    await expect(
      fetchContent({ config: createConfig({ contentstackApiKey: undefined }), log })
    ).rejects.toThrow(/No Contentstack stack API key configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a delivery token', async () => {
    await expect(
      fetchContent({ config: createConfig({ contentstackDeliveryToken: undefined }), log })
    ).rejects.toThrow(/No Contentstack delivery token configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires at least one content type', async () => {
    await expect(
      fetchContent({ config: createConfig({ contentstackContentTypes: [] }), log })
    ).rejects.toThrow(/No Contentstack content types configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not send the credentials to a non-Contentstack host', async () => {
    await expect(
      fetchContent({ config: createConfig({ contentstackHost: 'example.com' }), log })
    ).rejects.toThrow(/Refusing to fetch/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing local content path without calling Contentstack', async () => {
    await expect(
      fetchContent({
        config: createConfig({ localContentPath: '/does/not/exist/security-labs' }),
        log,
      })
    ).rejects.toThrow('Local content path does not exist: /does/not/exist/security-labs');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
