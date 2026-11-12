/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'cheerio';
import type { IndexedSecurityLabsDocument } from '../types';

/**
 * Contentstack field UIDs read from each Security Labs entry. `title`, `url`, `created_at`
 * and `publish_details` are Contentstack system fields and are always present.
 */
export const CONTENTSTACK_ENTRY_FIELDS = {
  slug: 'slug',
  date: 'date',
  description: 'description',
  authors: 'author',
  categories: 'category',
  body: 'body',
} as const;

/** Reference fields resolved via `include[]` so authors/categories carry their slugs. */
export const CONTENTSTACK_REFERENCE_FIELDS: readonly string[] = [
  CONTENTSTACK_ENTRY_FIELDS.authors,
  CONTENTSTACK_ENTRY_FIELDS.categories,
];

interface ContentstackPublishDetails {
  time?: string;
}

export interface ContentstackEntry {
  uid: string;
  title?: string;
  url?: string;
  created_at?: string;
  publish_details?: ContentstackPublishDetails | ContentstackPublishDetails[];
  [field: string]: unknown;
}

interface JsonRteNode {
  type?: string;
  text?: string;
  children?: JsonRteNode[];
}

const HTML_BLOCK_ELEMENTS = 'p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, tr, div';
const HTML_TAG = /<\/?[a-z][^>]*>/i;
const JSON_RTE_INLINE_TYPES = new Set(['a', 'span', 'inlineCode']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const collapseBlankLines = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const htmlToText = (html: string): string => {
  const $ = load(html);
  $('br').replaceWith('\n');
  $(HTML_BLOCK_ELEMENTS).append('\n');
  return collapseBlankLines($.root().text());
};

const jsonRteToText = (node: JsonRteNode): string => {
  if (typeof node.text === 'string') {
    return node.text;
  }
  const inner = (node.children ?? []).map(jsonRteToText).join('');
  return node.type && JSON_RTE_INLINE_TYPES.has(node.type) ? inner : `${inner}\n`;
};

/**
 * Converts an entry body to plain text for embedding. Supports Markdown strings, HTML
 * (rich text editor) strings, and JSON Rich Text Editor documents.
 */
export const getBodyText = (body: unknown): string | undefined => {
  if (typeof body === 'string') {
    const text = HTML_TAG.test(body) ? htmlToText(body) : collapseBlankLines(body);
    return text === '' ? undefined : text;
  }
  if (isRecord(body) && Array.isArray(body.children)) {
    const text = collapseBlankLines(jsonRteToText(body as JsonRteNode));
    return text === '' ? undefined : text;
  }
  return undefined;
};

const getSlug = (entry: ContentstackEntry): string | undefined =>
  getString(entry[CONTENTSTACK_ENTRY_FIELDS.slug]) ??
  getString(entry.url)?.split('/').filter(Boolean).pop();

const getPublishTime = ({ publish_details: details }: ContentstackEntry): string | undefined =>
  Array.isArray(details) ? getString(details[0]?.time) : getString(details?.time);

const getReferenceNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((reference: unknown) => {
    if (typeof reference === 'string') {
      return [reference];
    }
    if (!isRecord(reference)) {
      return [];
    }
    const name =
      getString(reference.slug) ?? getString(reference.title) ?? getString(reference.uid);
    return name ? [name] : [];
  });
};

/**
 * Maps a published Contentstack entry to the indexed document shape. Returns `null` for
 * entries missing a title, slug, or body so they can be logged and skipped.
 */
export const contentstackEntryToDocument = (
  entry: ContentstackEntry
): IndexedSecurityLabsDocument | null => {
  const title = getString(entry.title);
  const slug = getSlug(entry);
  const content = getBodyText(entry[CONTENTSTACK_ENTRY_FIELDS.body]);

  if (!title || !slug || !content) {
    return null;
  }

  return {
    title,
    slug,
    date:
      getString(entry[CONTENTSTACK_ENTRY_FIELDS.date]) ??
      getPublishTime(entry) ??
      getString(entry.created_at) ??
      new Date().toISOString(),
    description: getString(entry[CONTENTSTACK_ENTRY_FIELDS.description]) ?? '',
    authors: getReferenceNames(entry[CONTENTSTACK_ENTRY_FIELDS.authors]).join(', '),
    categories: getReferenceNames(entry[CONTENTSTACK_ENTRY_FIELDS.categories]),
    content,
    resource_type: 'security_labs',
  };
};
