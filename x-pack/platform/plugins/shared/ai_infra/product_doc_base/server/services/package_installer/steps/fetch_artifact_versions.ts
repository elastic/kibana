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
import { isImpliedDefaultElserInferenceId } from '@kbn/product-doc-common/src/is_default_inference_endpoint';
import * as fs from 'fs';
import Path from 'path';
import { URL } from 'url';
import { parseString } from 'xml2js';
import { resolveLocalArtifactsPath } from '../utils/local_artifacts';
import { getFetchOptions } from '../../proxy';
import { LATEST_PRODUCT_VERSION } from '../../../../common/consts';

export type ArtifactProductKey = ProductName | 'openapi';

export type ArtifactAvailableVersions = Record<ArtifactProductKey, string[]>;

export type ArtifactLastModifiedByProductVersion = Partial<
  Record<ArtifactProductKey, Record<string, string>>
>;

export interface ArtifactRepositoryVersions {
  /** Versions whose artifact may exist for the inference ID, per product */
  versions: ArtifactAvailableVersions;
  /** Products with at least one artifact in the repository, for any inference ID */
  publishedProducts: Array<ProductName | 'openapi'>;
  /** ISO 8601 GCS LastModified keyed by product then version string as stored in `versions`. */
  lastModifiedByProductVersion: ArtifactLastModifiedByProductVersion;
}

export interface SecurityLabsVersionsResult {
  versions: string[];
  /** ISO 8601 LastModified keyed by version string. */
  lastModifiedByVersion: Record<string, string>;
}

const normalizeArtifactKey = (artifactName: string): string => {
  const withExtension = artifactName.endsWith('.zip') ? artifactName : `${artifactName}.zip`;
  return withExtension.toLowerCase();
};

const toIsoLastModified = (dateModified: string | undefined): string | undefined => {
  if (!dateModified) {
    return undefined;
  }
  const timestamp = Date.parse(dateModified);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  // Normalize to second precision so comparisons with HTTP Last-Modified are stable.
  return new Date(Math.floor(timestamp / 1000) * 1000).toISOString();
};

const recordLastModified = ({
  lastModifiedByProductVersion,
  productName,
  version,
  dateModified,
}: {
  lastModifiedByProductVersion: ArtifactLastModifiedByProductVersion;
  productName: ArtifactProductKey;
  version: string;
  dateModified: string | undefined;
}): void => {
  const iso = toIsoLastModified(dateModified);
  if (!iso) {
    return;
  }
  const byVersion = lastModifiedByProductVersion[productName] ?? {};
  byVersion[version] = iso;
  lastModifiedByProductVersion[productName] = byVersion;
};

/**
 * Unsuffixed zips belong to ELSER. A suffixed key belongs to that inference ID only.
 */
const artifactMatchesInferenceId = (
  artifactInferenceId: string | undefined,
  requestedInferenceId: string
): boolean => {
  if (isImpliedDefaultElserInferenceId(requestedInferenceId)) {
    return (
      artifactInferenceId === undefined || isImpliedDefaultElserInferenceId(artifactInferenceId)
    );
  }
  return artifactInferenceId?.toLowerCase() === requestedInferenceId.toLowerCase();
};

/**
 * Fetches the available artifact versions per product.
 *
 * Versioned (semver) entries are listed whatever the inference ID they were published for: the
 * installer probes the artifact of the requested inference ID and falls back to previous versions.
 * `latest` entries are versioned by the upload date of the artifact, so only the artifact published
 * for `inferenceId` counts: a republish of another variant must not trigger a re-download. A product
 * published for other inference IDs only is reported in `publishedProducts` with no version.
 * LastModified is taken from the object published for `inferenceId` when that object exists, so
 * another model's newer upload of the same stack version is not reported as an update.
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

      const allowedProductNames: ArtifactProductKey[] = Object.values(DocumentationProduct);
      allowedProductNames.push('openapi');

      const record: ArtifactAvailableVersions = {} as ArtifactAvailableVersions;
      allowedProductNames.forEach((product) => {
        record[product] = [];
      });
      const publishedProducts = new Set<ArtifactProductKey>();
      const lastModifiedByProductVersion: ArtifactLastModifiedByProductVersion = {};
      const versionsWithMatchingLastModified = new Set<string>();

      const rememberLastModified = (
        productName: ArtifactProductKey,
        version: string,
        dateModified: string | undefined,
        matchesRequestedInference: boolean
      ) => {
        const key = `${productName}\0${version}`;
        if (!matchesRequestedInference && versionsWithMatchingLastModified.has(key)) {
          return;
        }
        recordLastModified({
          lastModifiedByProductVersion,
          productName,
          version,
          dateModified,
        });
        if (matchesRequestedInference) {
          versionsWithMatchingLastModified.add(key);
        }
      };

      result.ListBucketResult.Contents?.forEach((contentEntry) => {
        const artifactName = contentEntry.Key[0];
        const dateModified = contentEntry.LastModified?.[0];
        const parsed = parseArtifactName(artifactName);
        if (!parsed) {
          return;
        }
        const { productName, productVersion, inferenceId: artifactInferenceId } = parsed;
        publishedProducts.add(productName);
        if (productVersion !== LATEST_PRODUCT_VERSION) {
          record[productName].push(productVersion);
          rememberLastModified(
            productName,
            productVersion,
            dateModified,
            artifactMatchesInferenceId(artifactInferenceId, inferenceId)
          );
          return;
        }
        const expectedName = getArtifactName({
          productName,
          productVersion: LATEST_PRODUCT_VERSION,
          inferenceId,
        });
        if (normalizeArtifactKey(artifactName) === expectedName) {
          // "latest" -> "latest-2026-01-27T23:25:54.727Z": the upload date versions the artifact
          const version = `${productVersion}-${dateModified}`;
          record[productName].push(version);
          rememberLastModified(productName, version, dateModified, true);
        }
      });

      resolve({
        versions: record,
        publishedProducts: [...publishedProducts],
        lastModifiedByProductVersion,
      });
    });
  });
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
}): Promise<SecurityLabsVersionsResult> => {
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
      const lastModifiedByVersion: Record<string, string> = {};

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
          const iso = toIsoLastModified(contentEntry.LastModified?.[0]);
          if (iso) {
            lastModifiedByVersion[parsed.version] = iso;
          }
        }
      });

      resolve({ versions, lastModifiedByVersion });
    });
  });
};
