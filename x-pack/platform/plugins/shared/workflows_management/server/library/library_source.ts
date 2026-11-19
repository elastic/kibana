/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import type { Template, TemplateBody } from '@kbn/workflows-library';

import { LibraryFetchError } from './errors';
import type { LibraryCache, LibraryHealth } from './library_cache';

/**
 * Source-mode abstraction the {@link LibraryService} consumes. Two
 * implementations exist:
 *   - `LibraryFetcher` — HTTP source mode (fetches from the CDN).
 *   - `LibraryBundleReader` — local bundle source mode (reads an extracted
 *     air-gap tarball from the Kibana host's filesystem).
 *
 * The service selects one at construction time based on plugin config
 * (`bundlePath` set ⇒ bundle, otherwise HTTP); route handlers never see the
 * difference.
 *
 * This is an abstract base (not an interface) so the two source modes share
 * the passive {@link LibraryCache}, the `getHealth` delegation, the body
 * integrity guard, and the response size caps — keeping their retrieval
 * behavior in parity — while `listTemplates` / `getTemplate` stay abstract.
 */
export abstract class LibrarySource {
  /**
   * Upper bounds (bytes) on a single response/file. Sized to reject only
   * disproportionate / hostile payloads, not legitimately large catalogs or
   * template bodies — payloads are buffered fully in memory before parsing, so
   * this caps the memory a single read can cost. The catalog (up to 1000 rows)
   * gets a larger allowance than a single template body.
   */
  protected static readonly MAX_CATALOG_BYTES = 25 * 1024 * 1024;
  protected static readonly MAX_BODY_BYTES = 5 * 1024 * 1024;

  protected constructor(protected readonly cache: LibraryCache) {}

  abstract listTemplates(): Promise<Template[]>;
  abstract getTemplate(slug: string): Promise<TemplateBody>;

  getHealth(): LibraryHealth {
    return this.cache.getHealth();
  }

  /**
   * Integrity guard against list/detail drift and corruption: the fetched body
   * bytes must hash to the `contentHash` recorded on the catalog row. The
   * catalog generator (`elastic/workflows` `build-catalog.mjs`) computes
   * `sha256:<hex>` over the exact raw YAML file it also publishes at
   * `definitionUrl`, so a hash over the read bytes matches deterministically.
   * Because the hash covers the whole file (including the `template-metadata`
   * slug/version), a match also proves the body describes the template that was
   * listed — no separate slug/version comparison is needed.
   */
  protected assertContentHashMatches(row: Template, text: string, source: string): void {
    const actual = `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
    // `digest('hex')` is lowercase; the catalog schema accepts case-insensitive
    // hex, so normalize the row hash before comparing.
    if (actual !== row.contentHash.toLowerCase()) {
      throw new LibraryFetchError(
        `Template body at ${source} failed its integrity check ` +
          `(catalog: ${row.contentHash}, body: ${actual}).`,
        'integrity',
        source
      );
    }
  }
}
