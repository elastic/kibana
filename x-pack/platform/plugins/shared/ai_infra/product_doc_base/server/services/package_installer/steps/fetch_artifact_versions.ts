/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DocumentationProduct,
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

export interface FetchArtifactVersionsResult {
  versions: ArtifactAvailableVersions;
  /** ISO 8601 GCS LastModified keyed by product then version string as stored in `versions`. */
  lastModifiedByProductVersion: ArtifactLastModifiedByProductVersion;
}

const normalizeArtifactKey = (artifactName: string): string => {
  const withExtension = artifactName.endsWith('.zip') ? artifactName : `${artifactName}.zip`;
  return withExtension.toLowerCase();
};

const emptyVersions = (): ArtifactAvailableVersions => {
  const record = {} as ArtifactAvailableVersions;
  for (const product of Object.values(DocumentationProduct)) {
    record[product] = [];
  }
  record.openapi = [];
  return record;
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

export const fetchArtifactVersions = async ({
  artifactRepositoryUrl,
  artifactRepositoryProxyUrl,
  inferenceId,
}: {
  artifactRepositoryUrl: string;
  artifactRepositoryProxyUrl?: string;
  /**
   * When set, an artifact contributes its version and LastModified only if the object key is the
   * one published for this inference ID. The same stack version is a different object per model.
   * Serverless `latest` keys are replaced in place, so that object's LastModified is the version.
   */
  inferenceId?: string;
}): Promise<FetchArtifactVersionsResult> => {
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

      const versions = emptyVersions();
      const lastModifiedByProductVersion: ArtifactLastModifiedByProductVersion = {};

      result.ListBucketResult.Contents?.forEach((contentEntry) => {
        const artifactName = contentEntry.Key[0];
        const dateModified = contentEntry.LastModified?.[0];
        const parsed = parseArtifactName(artifactName);
        if (parsed) {
          const { productName, productVersion, inferenceId: artifactInferenceId } = parsed;
          // Same stack version is a different object per model. Another model's newer upload
          // must not make this inference ID look out of date.
          if (
            inferenceId !== undefined &&
            !artifactMatchesInferenceId(artifactInferenceId, inferenceId)
          ) {
            return;
          }
          if (productVersion === LATEST_PRODUCT_VERSION) {
            // The object key stays `...-latest[--{inferenceId}].zip`. LastModified is the version.
            if (!dateModified) {
              return;
            }
            const version = `${productVersion}-${dateModified}`;
            versions[productName]!.push(version);
            recordLastModified({
              lastModifiedByProductVersion,
              productName,
              version,
              dateModified,
            });
            return;
          }
          versions[productName]!.push(productVersion);
          recordLastModified({
            lastModifiedByProductVersion,
            productName,
            version: productVersion,
            dateModified,
          });
        }
      });

      resolve({ versions, lastModifiedByProductVersion });
    });
  });
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

export interface SecurityLabsVersionsResult {
  versions: string[];
  /** ISO 8601 LastModified keyed by version string. */
  lastModifiedByVersion: Record<string, string>;
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
