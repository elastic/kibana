/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentstackEntry, JsonRteNode } from './contentstack_entry';
import {
  cleanMarkdown,
  contentstackEntryToDocument,
  jsonRteToMarkdown,
} from './contentstack_entry';

const ASSET_URL = 'https://images.contentstack.io/v3/assets/stack/asset/version/image1.png';

describe('cleanMarkdown', () => {
  it('replaces images with their alt text', () => {
    expect(
      cleanMarkdown(
        `Intro.\n\n![Validin timeline for 191.96.224[.]96](${ASSET_URL} "Timeline")\n\n![](${ASSET_URL})\n\nMore.`
      )
    ).toBe('Intro.\n\nValidin timeline for 191.96.224[.]96\n\nMore.');
  });

  it('keeps alt text that contains inline triple-backtick code', () => {
    expect(cleanMarkdown(`![\`\`\`BeingDebugged\`\`\` check via PEB](${ASSET_URL})`)).toBe(
      '```BeingDebugged``` check via PEB'
    );
  });

  it('removes asset links and reference definitions but keeps link text', () => {
    expect(
      cleanMarkdown(
        `See the [full report](${ASSET_URL}) and [docs](https://www.elastic.co/docs).\n\n  [1]: ${ASSET_URL}`
      )
    ).toBe('See the full report and [docs](https://www.elastic.co/docs).');
  });

  it('removes embeds and formatting tags', () => {
    expect(
      cleanMarkdown(
        '<div className="vidyard-video-container">\n<iframe src="https://play.vidyard.com/x"></iframe>\n</div>\n\n' +
          'A <u>disclosure</u> with <code>oci.dll</code> and a<br>break.'
      )
    ).toBe('A disclosure with oci.dll and a break.');
  });

  it('leaves fenced code untouched', () => {
    const markdown =
      '```html\n<div><img src="x"></div>\n```\n\n~~~html\n<div><img src="x"></div>\n~~~\n\nText with ```inline``` code.';
    expect(cleanMarkdown(markdown)).toBe(markdown);
  });

  it('leaves HTML in inline code untouched', () => {
    const markdown =
      'The payload `<b onmouseover=alert(1)>x</b>` uses ``<img src=`x`>`` and a `<br>` tag.';
    expect(cleanMarkdown(markdown)).toBe(markdown);
  });

  it('does not remove prose between quoted embed tags', () => {
    expect(
      cleanMarkdown(
        'The `<iframe>` tag loads the page.\n\nAttackers then close it with `</iframe>`.'
      )
    ).toBe('The `<iframe>` tag loads the page.\n\nAttackers then close it with `</iframe>`.');
  });

  it('removes embeds that span blank lines', () => {
    expect(
      cleanMarkdown('Before.\n\n<video controls>\n\n<source src="x.mp4">\n</video>\n\nAfter.')
    ).toBe('Before.\n\nAfter.');
  });

  it('closes a fence only with a run at least as long as its opener', () => {
    expect(
      cleanMarkdown(
        `~~~~md\n~~~\n![kept](${ASSET_URL})\n~~~~\n\n![Diagram](${ASSET_URL})\n\n\`\`\`\`\n\`\`\`\n<b>kept</b>\n\`\`\`\`\n\nDone.`
      )
    ).toBe(
      `~~~~md\n~~~\n![kept](${ASSET_URL})\n~~~~\n\nDiagram\n\n\`\`\`\`\n\`\`\`\n<b>kept</b>\n\`\`\`\`\n\nDone.`
    );
  });

  it('does not let an unmatched backtick in prose reach into a fenced block', () => {
    const markdown = 'Type ``` to start a fence:\n```html\n<div><b>payload</b></div>\n```';
    expect(cleanMarkdown(markdown)).toBe(markdown);
  });

  it('normalizes non-breaking spaces', () => {
    expect(cleanMarkdown('Elastic\u00a0Security&nbsp;Labs')).toBe('Elastic Security Labs');
  });
});

describe('jsonRteToMarkdown', () => {
  it('renders headings, paragraphs, links, and lists', () => {
    expect(
      jsonRteToMarkdown({
        type: 'doc',
        children: [
          { type: 'h2', children: [{ text: 'Overview' }] },
          {
            type: 'p',
            children: [
              { text: 'See ' },
              { type: 'a', children: [{ text: 'the paper' }] },
              { text: '.' },
            ],
          },
          {
            type: 'ul',
            children: [
              { type: 'li', children: [{ text: 'One' }] },
              {
                type: 'li',
                children: [
                  { type: 'p', children: [{ text: 'Two' }] },
                  { type: 'ol', children: [{ type: 'li', children: [{ text: 'Nested' }] }] },
                ],
              },
            ],
          },
        ],
      })
    ).toBe('## Overview\n\nSee the paper.\n\n- One\n- Two\n  1. Nested');
  });

  it('renders code blocks, ES|QL snippets, and info panels', () => {
    expect(
      jsonRteToMarkdown({
        type: 'doc',
        children: [
          { type: 'code', children: [{ text: 'lkd> !drvobj wesp f\n' }] },
          { type: 'esqlSnippet', attrs: { code: ' FROM logs-*\n| LIMIT 10\n' } },
          { type: 'infoPanel', attrs: { content: '<p>Emulation is <b>not</b> detonation.</p>' } },
        ],
      })
    ).toBe(
      '```\nlkd> !drvobj wesp f\n```\n\n```esql\nFROM logs-*\n| LIMIT 10\n```\n\nEmulation is not detonation.'
    );
  });

  it('renders tables as pipe-delimited rows', () => {
    const cell = (type: string, text: string) => ({
      type,
      children: [{ type: 'p', children: [{ text }] }],
    });
    expect(
      jsonRteToMarkdown({
        type: 'table',
        children: [
          {
            type: 'thead',
            children: [{ type: 'tr', children: [cell('th', 'Event'), cell('th', 'Mechanism')] }],
          },
          {
            type: 'tbody',
            children: [{ type: 'tr', children: [cell('td', 'Registry'), cell('td', 'Callback')] }],
          },
        ],
      })
    ).toBe('| Event | Mechanism |\n| Registry | Callback |');
  });

  it('keeps image alt text and drops videos', () => {
    expect(
      jsonRteToMarkdown({
        type: 'doc',
        children: [
          { type: 'image', attrs: { alt: 'EDR architecture diagram' }, children: [{ text: '' }] },
          { type: 'video', children: [{ text: '' }] },
          { type: 'fragment', children: [{ type: 'p', children: [{ text: 'After.' }] }] },
        ],
      })
    ).toBe('EDR architecture diagram\n\nAfter.');
  });
});

describe('contentstackEntryToDocument', () => {
  const entry: ContentstackEntry = {
    uid: 'blt1',
    title: 'Internal title',
    title_l10n: 'Inside the loop',
    url: '/security-labs/threat-command/agentic-offensive-frameworks/',
    date: '2026-11-13T16:00:00.000Z',
    summary_l10n: 'Five AI attack frameworks',
    author: [
      { uid: 'blta', title: 'Mika Ayenson' },
      { uid: 'bltb', title: 'Jane Doe' },
    ],
    categories: [
      {
        title: 'Threat Intelligence',
        url: '/security-labs/threat-command/category/threat-intelligence',
      },
      { title: 'AI Security', url: null },
    ],
    main_content: { markdown_l10n: `Article body\n\n![Diagram](${ASSET_URL})` },
  };

  it('maps a published entry with resolved references', () => {
    expect(contentstackEntryToDocument(entry)).toEqual({
      title: 'Inside the loop',
      slug: 'threat-command/agentic-offensive-frameworks',
      date: '2026-11-13',
      description: 'Five AI attack frameworks',
      authors: 'Mika Ayenson, Jane Doe',
      categories: ['threat-intelligence', 'AI Security'],
      content: 'Article body\n\nDiagram',
      resource_type: 'security_labs',
    });
  });

  it('uses the rich text body and the internal title', () => {
    expect(
      contentstackEntryToDocument({
        uid: 'blt2',
        title: 'Windows Endpoint Security Platform',
        url: '/security-labs/blog/windows-endpoint-security-platform-wesp',
        date: '2026-10-26',
        main_content: {
          markdown_l10n: '',
          body: {
            content_l10n: {
              type: 'doc',
              children: [{ type: 'p', children: [{ text: 'Rich text' }] }],
            },
          },
        },
      })
    ).toEqual(
      expect.objectContaining({
        title: 'Windows Endpoint Security Platform',
        slug: 'blog/windows-endpoint-security-platform-wesp',
        date: '2026-10-26',
        description: '',
        authors: '',
        categories: [],
        content: 'Rich text',
      })
    );
  });

  it('prefers the rich text body over leftover markdown', () => {
    const richText: JsonRteNode = {
      type: 'doc',
      children: [{ type: 'p', children: [{ text: 'Converted body' }] }],
    };
    expect(
      contentstackEntryToDocument({
        ...entry,
        main_content: { markdown_l10n: 'Stale body', body: { content_l10n: richText } },
      })?.content
    ).toBe('Converted body');
  });

  it('uses the markdown body when the rich text body has no text', () => {
    const emptyRichText: JsonRteNode = {
      type: 'doc',
      children: [
        { type: 'h2', children: [{ text: ' ' }] },
        { type: 'p', children: [{ text: '' }] },
      ],
    };
    expect(
      contentstackEntryToDocument({
        ...entry,
        main_content: { markdown_l10n: 'Article body', body: { content_l10n: emptyRichText } },
      })?.content
    ).toBe('Article body');
  });

  it.each([
    ['a title', { ...entry, title: undefined, title_l10n: ' ' }],
    ['a Security Labs URL', { ...entry, url: '/search-labs/blog/some-post' }],
    ['a body', { ...entry, main_content: { markdown_l10n: '' } }],
  ])('returns null without %s', (_field, invalidEntry) => {
    expect(contentstackEntryToDocument(invalidEntry)).toBeNull();
  });
});
