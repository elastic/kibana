/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'cheerio';
import type { IndexedSecurityLabsDocument } from '../types';
import contentstackContentTypes from '../contentstack_content_types.json';

/**
 * Path prefix of every Security Labs page on elastic.co. Document slugs are relative to it
 * (e.g. `blog/foo`, `threat-command/bar`) because Kibana builds citation links as
 * `https://www.elastic.co/security-labs/{slug}`.
 */
export const SECURITY_LABS_PATH_PREFIX = '/security-labs/';

/**
 * Entry queries that scope content types shared across the Elastic Labs sites to Security Labs
 * (`blog_v3` also holds Search Labs and Observability Labs posts). Also read by the Buildkite
 * content gate (`.buildkite/scripts/steps/gen_ai/security_labs_content_gate.sh`).
 */
export const CONTENTSTACK_CONTENT_TYPE_QUERIES: Readonly<Record<string, object>> =
  contentstackContentTypes;

/** Contentstack content types that hold Security Labs articles. */
export const SECURITY_LABS_CONTENT_TYPES: readonly string[] = Object.keys(
  CONTENTSTACK_CONTENT_TYPE_QUERIES
);

/** Reference fields resolved via `include[]` so authors/categories carry their titles and URLs. */
export const CONTENTSTACK_REFERENCE_FIELDS: readonly string[] = ['author', 'categories'];

interface ContentstackReference {
  uid?: string;
  title?: string;
  url?: string | null;
}

interface JsonRteAttrs {
  code?: string;
  content?: string;
  alt?: string;
}

export interface JsonRteNode {
  type?: string;
  text?: string;
  attrs?: JsonRteAttrs;
  children?: JsonRteNode[];
}

export interface ContentstackEntry {
  uid: string;
  title?: string;
  title_l10n?: string;
  url?: string;
  date?: string;
  summary_l10n?: string;
  author?: ContentstackReference[];
  categories?: ContentstackReference[];
  main_content?: {
    markdown_l10n?: string;
    body?: { content_l10n?: JsonRteNode };
  };
}

const MARKDOWN_IMAGE = /!\[((?:[^[\]]|\[[^\]]*\])*)\](?:\([^)]*\)|\[[^\]]*\])/g;
const CONTENTSTACK_ASSET_HOST = String.raw`https?://(?:images|assets)\.contentstack\.io/`;
const ASSET_LINK = new RegExp(
  String.raw`\[((?:[^[\]]|\[[^\]]*\])*)\]\(${CONTENTSTACK_ASSET_HOST}[^)]*\)`,
  'g'
);
const ASSET_LINK_DEFINITION = new RegExp(
  String.raw`^[ \t]*\[[^\]]+\]:[ \t]*${CONTENTSTACK_ASSET_HOST}.*$`,
  'gm'
);
const HTML_EMBED = /<(iframe|video)\b[\s\S]*?<\/\1>|<img\b[^>]*>/gi;
const HTML_LINE_BREAK = /<br\s*\/?>/gi;
const HTML_FORMATTING_TAG = /<\/?(?:b|center|code|div|em|i|span|strong|sub|sup|u)\b[^>]*>/gi;
const CODE_FENCE = /(^[ \t]*```[^`\n]*\n[\s\S]*?^[ \t]*```[ \t]*$)/m;
const NON_BREAKING_SPACE = /\u00a0|&nbsp;/g;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
const JSON_RTE_INLINE_TYPES = new Set(['a', 'span', 'inlineCode']);
const JSON_RTE_HEADING = /^h([1-6])$/;

const getString = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const collapseBlankLines = (text: string): string =>
  text
    .replace(NON_BREAKING_SPACE, ' ')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const htmlToText = (html: string): string => {
  const $ = load(html);
  $('br').replaceWith('\n');
  $('p, li, div').append('\n');
  return collapseBlankLines($.root().text());
};

/**
 * Removes image, asset, and embed markup from markdown prose (keeping image alt and link text)
 * while leaving fenced code untouched. Asset URLs only add noise to the embedded text.
 */
export const cleanMarkdown = (markdown: string): string =>
  collapseBlankLines(
    markdown
      .split(CODE_FENCE)
      .map((part, index) =>
        index % 2 === 1
          ? part
          : part
              .replace(MARKDOWN_IMAGE, (_match, alt: string) => alt.trim())
              .replace(ASSET_LINK, (_match, text: string) => text.trim())
              .replace(ASSET_LINK_DEFINITION, '')
              .replace(HTML_EMBED, '')
              .replace(HTML_LINE_BREAK, ' ')
              .replace(HTML_FORMATTING_TAG, '')
      )
      .join('')
  );

const renderInline = (node: JsonRteNode): string =>
  typeof node.text === 'string' ? node.text : (node.children ?? []).map(renderInline).join('');

const indent = (text: string, prefix: string): string =>
  text
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${' '.repeat(prefix.length)}${line}`))
    .join('\n');

const renderList = (node: JsonRteNode, ordered: boolean): string =>
  (node.children ?? [])
    .map((item, index) => {
      const marker = ordered ? `${index + 1}. ` : '- ';
      return `${marker}${indent(renderContainer(item, '\n'), marker)}`;
    })
    .join('\n');

const renderTable = (node: JsonRteNode): string => {
  const rows: string[] = [];
  const collectRows = (current: JsonRteNode) => {
    if (current.type === 'tr') {
      const cells = (current.children ?? []).map((cell) =>
        renderInline(cell).replace(/\s+/g, ' ').trim()
      );
      rows.push(`| ${cells.join(' | ')} |`);
      return;
    }
    (current.children ?? []).forEach(collectRows);
  };
  collectRows(node);
  return rows.join('\n');
};

function renderChildren(node: JsonRteNode, separator: string): string {
  return (node.children ?? [])
    .map(renderNode)
    .filter((text) => text.trim() !== '')
    .join(separator);
}

/** Renders block children on separate lines, or inline children as a single run of text. */
function renderContainer(node: JsonRteNode, blockSeparator: string): string {
  const hasBlockChildren = (node.children ?? []).some(
    ({ type }) => type !== undefined && !JSON_RTE_INLINE_TYPES.has(type)
  );
  return hasBlockChildren ? renderChildren(node, blockSeparator) : renderInline(node);
}

function renderNode(node: JsonRteNode): string {
  if (typeof node.text === 'string') {
    return node.text;
  }

  const type = node.type ?? '';
  const heading = JSON_RTE_HEADING.exec(type);
  if (heading) {
    return `${'#'.repeat(Number(heading[1]))} ${renderInline(node).trim()}`;
  }

  switch (type) {
    case 'p':
      return renderInline(node);
    case 'code':
      return `\`\`\`\n${renderInline(node).replace(/\n+$/, '')}\n\`\`\``;
    case 'esqlSnippet':
      return `\`\`\`esql\n${(node.attrs?.code ?? '').trim()}\n\`\`\``;
    case 'infoPanel':
      return htmlToText(node.attrs?.content ?? '');
    case 'blockquote':
      return renderChildren(node, '\n\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    case 'ul':
      return renderList(node, false);
    case 'ol':
      return renderList(node, true);
    case 'table':
      return renderTable(node);
    case 'image':
      return node.attrs?.alt?.trim() ?? '';
    case 'video':
      return '';
    default:
      return renderContainer(node, '\n\n');
  }
}

/**
 * Converts a JSON Rich Text Editor document to markdown-flavored text, so entries authored in
 * the rich text editor embed the same way as entries authored in markdown.
 */
export const jsonRteToMarkdown = (doc: JsonRteNode): string => collapseBlankLines(renderNode(doc));

const getBodyText = ({ main_content: mainContent }: ContentstackEntry): string | undefined => {
  const markdown = getString(mainContent?.markdown_l10n);
  if (markdown) {
    return getString(cleanMarkdown(markdown));
  }
  const richText = mainContent?.body?.content_l10n;
  return richText ? getString(jsonRteToMarkdown(richText)) : undefined;
};

const getSlug = ({ url }: ContentstackEntry): string | undefined => {
  const path = getString(url);
  if (!path?.startsWith(SECURITY_LABS_PATH_PREFIX)) {
    return undefined;
  }
  return getString(path.slice(SECURITY_LABS_PATH_PREFIX.length).replace(/\/+$/, ''));
};

const getDate = ({ date }: ContentstackEntry): string | undefined => {
  const value = getString(date);
  return value && ISO_DATE.test(value) ? value.slice(0, 10) : value;
};

const getReferenceTitles = (references: ContentstackReference[] = []): string[] =>
  references.flatMap(({ title }) => {
    const name = getString(title);
    return name ? [name] : [];
  });

const getCategorySlugs = (references: ContentstackReference[] = []): string[] =>
  references.flatMap(({ title, url }) => {
    const slug = getString(url)?.split('/').filter(Boolean).pop() ?? getString(title);
    return slug ? [slug] : [];
  });

/**
 * Maps a published Security Labs entry to the indexed document shape. Returns `null` for
 * entries missing a title, a `/security-labs/` URL, or a body so they can be logged and skipped.
 */
export const contentstackEntryToDocument = (
  entry: ContentstackEntry
): IndexedSecurityLabsDocument | null => {
  const title = getString(entry.title_l10n) ?? getString(entry.title);
  const slug = getSlug(entry);
  const content = getBodyText(entry);

  if (!title || !slug || !content) {
    return null;
  }

  return {
    title,
    slug,
    date: getDate(entry) ?? new Date().toISOString().slice(0, 10),
    description: getString(entry.summary_l10n) ?? '',
    authors: getReferenceTitles(entry.author).join(', '),
    categories: getCategorySlugs(entry.categories),
    content,
    resource_type: 'security_labs',
  };
};
