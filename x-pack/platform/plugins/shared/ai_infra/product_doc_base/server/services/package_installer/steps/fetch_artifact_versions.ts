/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DocumentationProduct,
  getArtifactName,
  getSecurityLabsArtifactName,
  parseArtifactName,
  parseSecurityLabsArtifactName,
  type ProductName,
} from '@kbn/product-doc-common';
import * as fs from 'fs';
import Path from 'path';
import { URL } from 'url';
import { parseString, parseStringPromise } from 'xml2js';
import { resolveLocalArtifactsPath } from '../utils/local_artifacts';
import { getFetchOptions } from '../../proxy';
import { LATEST_PRODUCT_VERSION } from '../../../../common/consts';
type ArtifactAvailableVersions = Record<ProductName | 'openapi', string[]>;

export interface ArtifactRepositoryVersions {
  /** Versions whose artifact may exist for the inference ID, per product */
  versions: ArtifactAvailableVersions;
  /** Products with at least one artifact in the repository, for any inference ID */
  publishedProducts: Array<ProductName | 'openapi'>;
}

const normalizeArtifactKey = (artifactName: string): string => {
  const withExtension = artifactName.endsWith('.zip') ? artifactName : `${artifactName}.zip`;
  return withExtension.toLowerCase();
};

/**
 * Fetches the available artifact versions per product.
 *
 * Versioned (semver) entries are listed whatever the inference ID they were published for: the
 * installer probes the artifact of the requested inference ID and falls back to previous versions.
 * `latest` entries are versioned by the upload date of the artifact, so only the artifact published
 * for `inferenceId` counts: a republish of another variant must not trigger a re-download. A product
 * published for other inference IDs only is reported in `publishedProducts` with no version.
 */
export const fetchArtifactVersions = async ({
  artifactRepositoryUrl,
  artifactRepositoryProxyUrl,
  inferenceId,
}: {
  artifactRepositoryUrl: string;
  artifactRepositoryProxyUrl?: string;
  inferenceId: string;
}): Promise<ArtifactRepositoryVersions> => {
  const parsedUrl = new URL(artifactRepositoryUrl);

  let xml: string;
  if (parsedUrl.protocol === 'file:') {
    const file = await fetchLocalFile(parsedUrl);
    xml = file.toString();
  } else {
    const fetchUrl = `${artifactRepositoryUrl}?max-keys=1000`;
    const fetchOptions = getFetchOptions(fetchUrl, artifactRepositoryProxyUrl);
    const res = await fetch(fetchUrl, fetchOptions as RequestInit);
    xml = await res.text();
  }

  return new Promise((resolve, reject) => {
    parseString(xml, (err, result: ListBucketResponse) => {
      if (err) {
        reject(err);
      }

      // 6 artifacts per minor stack version means we have a few decades before facing this problem
      if (result.ListBucketResult.IsTruncated?.includes('true')) {
        throw new Error('bucket content is truncated, cannot retrieve all versions');
      }

      const allowedProductNames: (ProductName | 'openapi')[] = Object.values(DocumentationProduct);
      allowedProductNames.push('openapi');

      const record: ArtifactAvailableVersions = {} as ArtifactAvailableVersions;
      allowedProductNames.forEach((product) => {
        record[product as ProductName] = [];
      });
      const publishedProducts = new Set<ProductName | 'openapi'>();

      result.ListBucketResult.Contents?.forEach((contentEntry) => {
        const artifactName = contentEntry.Key[0];
        const dateModified = contentEntry.LastModified?.[0];
        const parsed = parseArtifactName(artifactName);
        if (!parsed) {
          return;
        }
        const { productName, productVersion } = parsed;
        publishedProducts.add(productName);
        if (productVersion !== LATEST_PRODUCT_VERSION) {
          record[productName].push(productVersion);
          return;
        }
        const expectedName = getArtifactName({
          productName,
          productVersion: LATEST_PRODUCT_VERSION,
          inferenceId,
        });
        if (normalizeArtifactKey(artifactName) === expectedName) {
          // "latest" -> "latest-2026-01-27T23:25:54.727Z": the upload date versions the artifact
          record[productName].push(`${productVersion}-${dateModified}`);
        }
      });

      resolve({ versions: record, publishedProducts: [...publishedProducts] });
    });
  });
};

/**
 * Version of a local (`file://`) repository: the newest `LastModified` of its index, so a newer
 * bundle always compares greater. Remote repositories have no version.
 */
export const fetchLocalRepositoryVersion = async ({
  artifactRepositoryUrl,
}: {
  artifactRepositoryUrl: string;
}): Promise<string | undefined> => {
  const parsedUrl = new URL(artifactRepositoryUrl);
  if (parsedUrl.protocol !== 'file:') {
    return undefined;
  }
  const result: ListBucketResponse = await parseStringPromise(
    (await fetchLocalFile(parsedUrl)).toString()
  );
  const lastModified = (result.ListBucketResult.Contents ?? [])
    .map((entry) => entry.LastModified?.[0])
    .filter((value): value is string => Boolean(value));
  return lastModified.length > 0 ? lastModified.sort().reverse()[0] : undefined;
};

function fetchLocalFile(parsedUrl: URL): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const normalizedPath = resolveLocalArtifactsPath(parsedUrl);
    const xmlFilePath = Path.join(normalizedPath, 'index.xml');

    fs.readFile(xmlFilePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

interface ListBucketResponse {
  ListBucketResult: {
    Name?: string[];
    IsTruncated?: string[];
    Contents?: Array<{ Key: string[]; LastModified: string[] }>;
  };
}

/**
 * Fetches available Security Labs artifact versions for a specific inference ID.
 *
 * Only versions whose exact downloadable filename matches
 * `getSecurityLabsArtifactName({ version, inferenceId })` are returned, so a newer
 * Jina-only publish cannot poison ELSER "latest" selection (and vice versa).
 */
export const fetchSecurityLabsVersions = async ({
  artifactRepositoryUrl,
  artifactRepositoryProxyUrl,
  inferenceId,
}: {
  artifactRepositoryUrl: string;
  artifactRepositoryProxyUrl?: string;
  inferenceId: string;
}): Promise<string[]> => {
  const parsedUrl = new URL(artifactRepositoryUrl);

  let xml: string;
  if (parsedUrl.protocol === 'file:') {
    const file = await fetchLocalFile(parsedUrl);
    xml = file.toString();
  } else {
    const fetchUrl = `${artifactRepositoryUrl}?max-keys=1000`;
    const fetchOptions = getFetchOptions(fetchUrl, artifactRepositoryProxyUrl);
    const res = await fetch(fetchUrl, fetchOptions as RequestInit);
    xml = await res.text();
  }

  return new Promise((resolve, reject) => {
    parseString(xml, (err, result: ListBucketResponse) => {
      if (err) {
        reject(err);
        return;
      }

      if (result.ListBucketResult.IsTruncated?.includes('true')) {
        throw new Error('bucket content is truncated, cannot retrieve all versions');
      }

      const versions: string[] = [];

      result.ListBucketResult.Contents?.forEach((contentEntry) => {
        const artifactName = contentEntry.Key[0];
        const parsed = parseSecurityLabsArtifactName(artifactName);
        if (!parsed) {
          return;
        }

        const expectedName = getSecurityLabsArtifactName({
          version: parsed.version,
          inferenceId,
        });
        if (normalizeArtifactKey(artifactName) === expectedName) {
          versions.push(parsed.version);
        }
      });

      resolve(versions);
    });
  });
};
