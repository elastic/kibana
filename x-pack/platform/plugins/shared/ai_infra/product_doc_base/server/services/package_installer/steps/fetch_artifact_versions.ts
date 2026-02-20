/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DocumentationProduct,
  parseArtifactName,
  parseSecurityLabsArtifactName,
  type ProductName,
} from '@kbn/product-doc-common';
import * as fs from 'fs';
import Path from 'path';
import { URL } from 'url';
import { parseString } from 'xml2js';
import { resolveLocalArtifactsPath } from '../utils/local_artifacts';
import { getFetchOptions } from '../../proxy';

type ArtifactAvailableVersions = Record<ProductName, string[]>;

export const fetchArtifactVersions = async ({
  artifactRepositoryUrl,
  artifactRepositoryProxyUrl,
}: {
  artifactRepositoryUrl: string;
  artifactRepositoryProxyUrl?: string;
}): Promise<ArtifactAvailableVersions> => {
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

      const allowedProductNames: ProductName[] = Object.values(DocumentationProduct);

      const record: ArtifactAvailableVersions = {} as ArtifactAvailableVersions;
      allowedProductNames.forEach((product) => {
        record[product] = [];
      });

      result.ListBucketResult.Contents?.forEach((contentEntry) => {
        const artifactName = contentEntry.Key[0];
        const parsed = parseArtifactName(artifactName);
        if (parsed) {
          const { productName, productVersion } = parsed;
          record[productName]!.push(productVersion);
        }
      });

      resolve(record);
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
    Contents?: Array<{ Key: string[] }>;
  };
}

/**
 * Fetches available Security Labs artifact versions from the repository.
 */
export const fetchSecurityLabsVersions = async ({
  artifactRepositoryUrl,
  artifactRepositoryProxyUrl,
}: {
  artifactRepositoryUrl: string;
  artifactRepositoryProxyUrl?: string;
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
        if (parsed) {
          versions.push(parsed.version);
        }
      });

      resolve(versions);
    });
  });
};
