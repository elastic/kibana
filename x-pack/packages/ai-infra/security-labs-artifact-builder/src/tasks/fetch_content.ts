/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';
import type { ToolingLog } from '@kbn/tooling-log';
import type { IndexedSecurityLabsDocument, TaskConfig } from '../types';
import { parseMarkdownFiles } from './parse_markdown';
import type { ContentstackEntry } from './contentstack_entry';
import { CONTENTSTACK_REFERENCE_FIELDS, contentstackEntryToDocument } from './contentstack_entry';

/** Maximum page size supported by the Contentstack Content Delivery API. */
export const CONTENTSTACK_PAGE_SIZE = 100;

/** Content Delivery API hosts for every Contentstack region (e.g. `cdn.contentstack.io`, `eu-cdn.contentstack.com`). */
const ALLOWED_CONTENTSTACK_HOST = /^(?:[a-z0-9-]+-)?cdn\.contentstack\.(?:io|com)$/;

/**
 * Ensures the stack credentials are only ever sent to a Contentstack Content Delivery API host,
 * so a misconfigured CI env cannot leak it or publish another source as Security Labs KB.
 */
export const assertAllowedContentstackHost = (host: string): void => {
  if (!ALLOWED_CONTENTSTACK_HOST.test(host)) {
    throw new Error(
      `Refusing to fetch Security Labs content from [${host}]. Expected a Contentstack ` +
        `Content Delivery API host such as [cdn.contentstack.io] or [eu-cdn.contentstack.com]. ` +
        `Use --localContentPath for local content.`
    );
  }
};

interface ContentstackCredentials {
  apiKey: string;
  deliveryToken: string;
}

interface ContentstackEntriesResponse {
  entries?: ContentstackEntry[];
  count?: number;
  error_message?: string;
}

const fetchEntriesPage = async ({
  config,
  credentials,
  contentType,
  skip,
}: {
  config: TaskConfig;
  credentials: ContentstackCredentials;
  contentType: string;
  skip: number;
}): Promise<{ entries: ContentstackEntry[]; count: number }> => {
  const url = new URL(
    `https://${config.contentstackHost}/v3/content_types/${encodeURIComponent(contentType)}/entries`
  );
  url.searchParams.set('environment', config.contentstackEnvironment);
  url.searchParams.set('locale', config.contentstackLocale);
  url.searchParams.set('limit', String(CONTENTSTACK_PAGE_SIZE));
  url.searchParams.set('skip', String(skip));
  url.searchParams.set('include_count', 'true');
  for (const field of CONTENTSTACK_REFERENCE_FIELDS) {
    url.searchParams.append('include[]', field);
  }

  const response = await fetch(url, {
    headers: {
      api_key: credentials.apiKey,
      access_token: credentials.deliveryToken,
    },
  });
  const body = (await response
    .json()
    .catch((): ContentstackEntriesResponse => ({}))) as ContentstackEntriesResponse;

  if (!response.ok) {
    throw new Error(
      `Contentstack request for content type [${contentType}] failed with HTTP ` +
        `${response.status}: ${body.error_message ?? response.statusText}`
    );
  }

  return { entries: body.entries ?? [], count: body.count ?? 0 };
};

const fetchContentTypeEntries = async ({
  config,
  credentials,
  contentType,
}: {
  config: TaskConfig;
  credentials: ContentstackCredentials;
  contentType: string;
}): Promise<ContentstackEntry[]> => {
  const entries: ContentstackEntry[] = [];
  let total = Infinity;

  while (entries.length < total) {
    const page = await fetchEntriesPage({
      config,
      credentials,
      contentType,
      skip: entries.length,
    });
    entries.push(...page.entries);
    total = page.count;

    if (page.entries.length < CONTENTSTACK_PAGE_SIZE) {
      break;
    }
  }

  return entries;
};

const loadLocalContent = async ({
  contentPath,
  log,
}: {
  contentPath: string;
  log: ToolingLog;
}): Promise<IndexedSecurityLabsDocument[]> => {
  log.info(`Using local content path: ${contentPath}`);

  try {
    await Fs.access(contentPath);
  } catch {
    throw new Error(`Local content path does not exist: ${contentPath}`);
  }

  return parseMarkdownFiles({ contentPath, log });
};

/**
 * Loads Security Labs documents from a local markdown checkout when `localContentPath` is set,
 * otherwise from the published entries of the configured Contentstack content types.
 */
export const fetchContent = async ({
  config,
  log,
}: {
  config: TaskConfig;
  log: ToolingLog;
}): Promise<IndexedSecurityLabsDocument[]> => {
  if (config.localContentPath) {
    return loadLocalContent({ contentPath: config.localContentPath, log });
  }

  const {
    contentstackHost,
    contentstackApiKey: apiKey,
    contentstackDeliveryToken: deliveryToken,
    contentstackContentTypes: contentTypes,
    contentstackEnvironment,
    contentstackLocale,
  } = config;

  assertAllowedContentstackHost(contentstackHost);

  if (!apiKey) {
    throw new Error(
      'No Contentstack stack API key configured; pass --contentstackApiKey ' +
        '(or set SECURITY_LABS_CONTENTSTACK_API_KEY), or use --localContentPath.'
    );
  }

  if (!deliveryToken) {
    throw new Error(
      'No Contentstack delivery token configured; pass --contentstackDeliveryToken ' +
        '(or set SECURITY_LABS_CONTENTSTACK_DELIVERY_TOKEN), or use --localContentPath.'
    );
  }

  if (contentTypes.length === 0) {
    throw new Error(
      'No Contentstack content types configured; pass --contentstackContentTypes ' +
        '(or set SECURITY_LABS_CONTENTSTACK_CONTENT_TYPES).'
    );
  }

  const documents: IndexedSecurityLabsDocument[] = [];

  for (const contentType of contentTypes) {
    log.info(
      `Fetching Contentstack entries for content type [${contentType}] ` +
        `(host: ${contentstackHost}, environment: ${contentstackEnvironment}, locale: ${contentstackLocale})`
    );

    const entries = await fetchContentTypeEntries({
      config,
      credentials: { apiKey, deliveryToken },
      contentType,
    });
    let skipped = 0;

    for (const entry of entries) {
      const document = contentstackEntryToDocument(entry);
      if (document) {
        documents.push(document);
      } else {
        skipped++;
        log.warning(
          `Skipping Contentstack entry [${entry.uid}] of type [${contentType}] without a title, slug, or body`
        );
      }
    }

    log.info(
      `Fetched ${entries.length} entries for content type [${contentType}] (${skipped} skipped)`
    );
  }

  return documents;
};
