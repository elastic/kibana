/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SecurityLabsDocument, IndexedSecurityLabsDocument } from '../types';

/**
 * Parses YAML frontmatter from markdown content.
 * Frontmatter is expected to be enclosed in --- delimiters.
 */
const parseFrontmatter = (
  content: string
): { frontmatter: Record<string, unknown>; body: string } => {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterStr = match[1];
  const body = match[2];

  // Simple YAML parsing for expected fields
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterStr.split('\n');

  let currentKey: string | null = null;
  let currentList: Array<string | Record<string, string>> = [];
  let inList = false;
  let currentListItem: Record<string, string> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for list item start (- something)
    if (trimmed.startsWith('- ') && currentKey && inList) {
      // Save previous list item if any
      if (currentListItem) {
        currentList.push(currentListItem);
        currentListItem = null;
      }

      const itemContent = trimmed.slice(2).trim();
      // Check if it's a nested key-value pair (e.g., "- slug: value")
      const colonIdx = itemContent.indexOf(':');
      if (colonIdx > 0) {
        const nestedKey = itemContent.slice(0, colonIdx).trim();
        const nestedValue = itemContent
          .slice(colonIdx + 1)
          .trim()
          .replace(/^["'](.*)["']$/, '$1');
        currentListItem = { [nestedKey]: nestedValue };
      } else {
        // Plain list item
        currentList.push(itemContent.replace(/^["'](.*)["']$/, '$1'));
      }
      continue;
    }

    // Check for continuation of nested object in list (indented key: value under a list item)
    if (currentListItem && line.match(/^\s{4,}/) && trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const nestedKey = trimmed.slice(0, colonIdx).trim();
      const nestedValue = trimmed
        .slice(colonIdx + 1)
        .trim()
        .replace(/^["'](.*)["']$/, '$1');
      currentListItem[nestedKey] = nestedValue;
      continue;
    }

    // Save previous list if we were building one
    if (inList && currentKey && !trimmed.startsWith('- ') && trimmed !== '') {
      // Save any pending list item
      if (currentListItem) {
        currentList.push(currentListItem);
        currentListItem = null;
      }
      frontmatter[currentKey] = currentList;
      currentList = [];
      inList = false;
    }

    // Parse key: value pairs at root level
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        if (value === '') {
          // This might be a list
          currentKey = key;
          inList = true;
          currentList = [];
        } else {
          // Simple value - remove surrounding quotes if present
          frontmatter[key] = value.replace(/^["'](.*)["']$/, '$1');
        }
      }
    }
  }

  // Don't forget the last list if any
  if (inList && currentKey) {
    if (currentListItem) {
      currentList.push(currentListItem);
    }
    frontmatter[currentKey] = currentList;
  }

  return { frontmatter, body };
};

/**
 * Recursively finds all markdown files in a directory.
 */
const findMarkdownFiles = async (dir: string): Promise<string[]> => {
  const entries = await Fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = Path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findMarkdownFiles(fullPath)));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      // Skip encoded files - we want the original source
      if (!entry.name.includes('.encoded.')) {
        files.push(fullPath);
      }
    }
  }

  return files;
};

/**
 * Extracts string values from potentially nested list items.
 * Handles formats like:
 *   - "value"
 *   - { slug: "value" }
 *   - { slug: "value", name: "display name" }
 */
const extractListValues = (
  items: Array<string | Record<string, string>>,
  preferredKey = 'slug'
): string[] => {
  return items.map((item) => {
    if (typeof item === 'string') {
      return item;
    }
    // For objects, prefer the specified key, fall back to first value, or stringify
    return item[preferredKey] ?? item.name ?? Object.values(item)[0] ?? JSON.stringify(item);
  });
};

/**
 * Parses a single markdown file into a SecurityLabsDocument.
 */
const parseMarkdownFile = async (filePath: string): Promise<SecurityLabsDocument | null> => {
  const content = await Fs.readFile(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  // Validate required fields
  const title = frontmatter.title as string;
  const slug = frontmatter.slug as string;

  if (!title || !slug) {
    return null; // Skip files without required frontmatter
  }

  // Extract authors - handle both simple strings and nested objects
  let authors: string[] = [];
  const authorField = frontmatter.author;
  if (Array.isArray(authorField)) {
    authors = extractListValues(authorField as Array<string | Record<string, string>>);
  } else if (typeof authorField === 'string') {
    authors = [authorField];
  }

  // Extract categories - handle both simple strings and nested objects
  let categories: string[] = [];
  const categoryField = frontmatter.category;
  if (Array.isArray(categoryField)) {
    categories = extractListValues(categoryField as Array<string | Record<string, string>>);
  } else if (typeof categoryField === 'string') {
    categories = [categoryField];
  }

  return {
    title,
    slug,
    date: (frontmatter.date as string) || new Date().toISOString(),
    description: (frontmatter.description as string) || '',
    authors,
    categories,
    content: body.trim(),
    sourceFile: filePath,
  };
};

/**
 * Converts a SecurityLabsDocument to the indexed format.
 */
const toIndexedDocument = (doc: SecurityLabsDocument): IndexedSecurityLabsDocument => {
  return {
    title: doc.title,
    slug: doc.slug,
    date: doc.date,
    description: doc.description,
    authors: doc.authors.join(', '),
    categories: doc.categories,
    content: doc.content,
    resource_type: 'security_labs',
  };
};

/**
 * Parses all markdown files in a directory and returns indexed documents.
 */
export const parseMarkdownFiles = async ({
  contentPath,
  log,
}: {
  contentPath: string;
  log: ToolingLog;
}): Promise<IndexedSecurityLabsDocument[]> => {
  log.info(`Scanning for markdown files in: ${contentPath}`);

  const markdownFiles = await findMarkdownFiles(contentPath);
  log.info(`Found ${markdownFiles.length} markdown files`);

  const documents: IndexedSecurityLabsDocument[] = [];

  for (const filePath of markdownFiles) {
    try {
      const doc = await parseMarkdownFile(filePath);
      if (doc) {
        documents.push(toIndexedDocument(doc));
        log.debug(`Parsed: ${doc.title}`);
      } else {
        log.warning(`Skipping file without required frontmatter: ${filePath}`);
      }
    } catch (error) {
      log.warning(`Failed to parse ${filePath}: ${error}`);
    }
  }

  return documents;
};
