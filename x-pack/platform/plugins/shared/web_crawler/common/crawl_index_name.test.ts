/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCrawlIndexName, isValidCrawlIndexName } from './crawl_index_name';

describe('getCrawlIndexName', () => {
  it.each([
    ['https://docs.example.co.uk/guide?page=1', 'web-crawl-docs.example.co.uk'],
    ['http://example.com/', 'web-crawl-example.com'],
    ['https://www.example.com:8443/some/path', 'web-crawl-example.com'],
    ['https://Docs.EXAMPLE.com/', 'web-crawl-docs.example.com'],
    ['https://my_site.example.com/', 'web-crawl-my_site.example.com'],
    ['https://a-b.com/', 'web-crawl-a-b.com'],
    ['http://[::1]/', 'web-crawl--1-'],
  ])('derives a valid index name from the host of %s', (url, indexName) => {
    expect(getCrawlIndexName(url)).toBe(indexName);
    expect(isValidCrawlIndexName(indexName)).toBe(true);
  });
});

describe('getCrawlIndexName for a very long host', () => {
  it('derives a name that is too long to crawl into, rather than cutting the host short', () => {
    const label = 'a'.repeat(62);
    const host = `${label}.${label}.${label}.${label}`;
    const indexName = getCrawlIndexName(`https://${host}/`);

    expect(indexName).toBe(`web-crawl-${host}`);
    expect(isValidCrawlIndexName(indexName)).toBe(false);
  });
});

describe('isValidCrawlIndexName', () => {
  it.each(['a', '9docs', 'docs-2024.01.31_v2', 'a'.repeat(255)])('accepts %s', (indexName) => {
    expect(isValidCrawlIndexName(indexName)).toBe(true);
  });

  it.each([
    ['an empty name', ''],
    ['a leading dot', '.kibana'],
    ['a leading dash', '-docs'],
    ['a leading underscore', '_docs'],
    ['an uppercase letter', 'web-crawl-Example.com'],
    ['a space', 'my docs'],
    ['a trailing line break', 'docs\n'],
    ['a wildcard', 'docs-*'],
    ['a comma', 'docs,logs'],
    ['a slash', 'docs/2024'],
    ['a colon', 'remote:docs'],
    ['a non-ASCII letter', 'dócs'],
    ['more than 255 characters', 'a'.repeat(256)],
  ])('rejects %s', (_, indexName) => {
    expect(isValidCrawlIndexName(indexName)).toBe(false);
  });
});
