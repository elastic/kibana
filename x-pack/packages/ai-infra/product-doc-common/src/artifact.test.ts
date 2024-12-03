/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactName, parseArtifactName } from './artifact';

describe('getArtifactName', () => {
  it('builds the name based on the provided product name and version', () => {
    expect(
      getArtifactName({
        productName: 'kibana',
        productVersion: '8.16',
      })
    ).toEqual('kb-product-doc-kibana-8.16.zip');
  });

  it('excludes the extension when excludeExtension is true', () => {
    expect(
      getArtifactName({
        productName: 'elasticsearch',
        productVersion: '8.17',
        excludeExtension: true,
      })
    ).toEqual('kb-product-doc-elasticsearch-8.17');
  });

  it('generates a lowercase name', () => {
    expect(
      getArtifactName({
        // @ts-expect-error testing
        productName: 'ElasticSearch',
        productVersion: '8.17',
        excludeExtension: true,
      })
    ).toEqual('kb-product-doc-elasticsearch-8.17');
  });
});

describe('parseArtifactName', () => {
  it('parses an artifact name with extension', () => {
    expect(parseArtifactName('kb-product-doc-kibana-8.16.zip')).toEqual({
      productName: 'kibana',
      productVersion: '8.16',
    });
  });

  it('parses an artifact name without extension', () => {
    expect(parseArtifactName('kb-product-doc-security-8.17')).toEqual({
      productName: 'security',
      productVersion: '8.17',
    });
  });

  it('returns undefined if the provided string does not match the artifact name pattern', () => {
    expect(parseArtifactName('some-wrong-name')).toEqual(undefined);
  });

  it('returns undefined if the provided string is not strictly lowercase', () => {
    expect(parseArtifactName('kb-product-doc-Security-8.17')).toEqual(undefined);
  });
});
