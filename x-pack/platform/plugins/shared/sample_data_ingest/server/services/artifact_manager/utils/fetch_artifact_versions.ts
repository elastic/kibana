/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentationProduct, parseArtifactName, type ProductName } from '@kbn/product-doc-common';
import * as fs from 'fs';
import fetch from 'node-fetch';
import * as Path from 'path';
import { URL } from 'url';
import { parseString } from 'xml2js';
import { resolveLocalPath } from './resolve_local_path';
import { validateMimeType, validateUrl } from './validators';

type ArtifactAvailableVersions = Record<ProductName, string[]>;

export const fetchArtifactVersions = async ({
  artifactRepositoryUrl,
}: {
  artifactRepositoryUrl: string;
}): Promise<ArtifactAvailableVersions> => {
  validateUrl(artifactRepositoryUrl);

  const parsedUrl = new URL(artifactRepositoryUrl);

  let xml: string;
  if (parsedUrl.protocol === 'file:') {
    const file = await fetchLocalFile(parsedUrl);
    xml = file.toString();
  } else {
    const res = await fetch(`${artifactRepositoryUrl}?max-keys=1000`);
    xml = await res.text();

    validateMimeType(res.headers.get('content-type'), 'application/xml');
  }

  return new Promise((resolve, reject) => {
    parseString(xml, (err, result: ListBucketResponse) => {
      if (err) {
        return reject(err);
      }

      // 6 artifacts per minor stack version means we have a few decades before facing this problem
      if (result.ListBucketResult.IsTruncated?.includes('true')) {
        return reject(new Error('bucket content is truncated, cannot retrieve all versions'));
      }

      const record: ArtifactAvailableVersions = Object.values(DocumentationProduct).reduce(
        (res, product) => ({ ...res, [product]: [] }),
        {} as ArtifactAvailableVersions
      );

      result.ListBucketResult.Contents?.forEach((contentEntry) => {
        const artifactName = contentEntry.Key[0];
        const parsed = parseArtifactName(artifactName);
        if (parsed) {
          const { productName, productVersion } = parsed;
          record[productName]?.push(productVersion);
        }
      });

      resolve(record);
    });
  });
};

function fetchLocalFile(parsedUrl: URL): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const normalizedPath = resolveLocalPath(parsedUrl);
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
