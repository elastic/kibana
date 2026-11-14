/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contentstackEntryToDocument, getBodyText } from './contentstack_entry';

describe('getBodyText', () => {
  it('keeps markdown bodies as-is', () => {
    expect(getBodyText('## Overview\n\nSome **markdown**.\n\n\n\nMore.')).toBe(
      '## Overview\n\nSome **markdown**.\n\nMore.'
    );
  });

  it('converts HTML bodies to text with block breaks', () => {
    expect(
      getBodyText(
        '<h2>Overview</h2><p>First <a href="#">link</a>.</p><ul><li>One</li><li>Two</li></ul>'
      )
    ).toBe('Overview\nFirst link.\nOne\nTwo');
  });

  it('converts JSON RTE documents to text with block breaks', () => {
    expect(
      getBodyText({
        type: 'doc',
        children: [
          { type: 'h2', children: [{ text: 'Overview' }] },
          {
            type: 'p',
            children: [
              { text: 'First ' },
              { type: 'a', children: [{ text: 'link' }] },
              { text: '.' },
            ],
          },
        ],
      })
    ).toBe('Overview\nFirst link.');
  });

  it.each([undefined, null, '', '   ', 42, { type: 'doc' }])(
    'returns undefined for an empty or unsupported body [%p]',
    (body) => {
      expect(getBodyText(body)).toBeUndefined();
    }
  );
});

describe('contentstackEntryToDocument', () => {
  it('maps a published entry with resolved references', () => {
    expect(
      contentstackEntryToDocument({
        uid: 'blt1',
        title: 'Inside the loop',
        slug: 'inside-the-loop',
        date: '2026-11-05',
        description: 'Agentic offensive frameworks',
        author: [
          { uid: 'blta', slug: 'jane-doe', title: 'Jane Doe' },
          { uid: 'bltb', title: 'John Roe' },
        ],
        category: [{ uid: 'bltc', slug: 'malware-analysis' }],
        body: 'Article body',
      })
    ).toEqual({
      title: 'Inside the loop',
      slug: 'inside-the-loop',
      date: '2026-11-05',
      description: 'Agentic offensive frameworks',
      authors: 'jane-doe, John Roe',
      categories: ['malware-analysis'],
      content: 'Article body',
      resource_type: 'security_labs',
    });
  });

  it('derives the slug from the entry URL and the date from publish details', () => {
    expect(
      contentstackEntryToDocument({
        uid: 'blt1',
        title: 'Zimbra SMTP command injection',
        url: '/security-labs/blog/command-injection-zimbra/',
        publish_details: { time: '2026-10-23T00:00:00.000Z' },
        body: 'Article body',
      })
    ).toEqual(
      expect.objectContaining({
        slug: 'command-injection-zimbra',
        date: '2026-10-23T00:00:00.000Z',
        description: '',
        authors: '',
        categories: [],
      })
    );
  });

  it.each([
    ['title', { uid: 'blt1', slug: 'slug', body: 'Body' }],
    ['slug', { uid: 'blt1', title: 'Title', body: 'Body' }],
    ['body', { uid: 'blt1', title: 'Title', slug: 'slug' }],
  ])('returns null when the %s is missing', (_field, entry) => {
    expect(contentstackEntryToDocument(entry)).toBeNull();
  });
});
