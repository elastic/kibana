/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { parseString } from 'xml2js';
import { type ProductName, DocumentationProduct, parseArtifactName } from '@kbn/product-doc-common';

type ArtifactAvailableVersions = Record<ProductName, string[]>;

export const fetchArtifactVersions = async ({
  artifactRepositoryUrl,
}: {
  artifactRepositoryUrl: string;
}): Promise<ArtifactAvailableVersions> => {
  const res = await fetch(`${artifactRepositoryUrl}?max-keys=1000`);
  const xml = await res.text();
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

interface ListBucketResponse {
  ListBucketResult: {
    Name?: string[];
    IsTruncated?: string[];
    Contents?: Array<{ Key: string[] }>;
  };
}
