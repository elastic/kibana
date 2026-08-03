/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getArtifactName,
  parseArtifactName,
  getSecurityLabsArtifactName,
  parseSecurityLabsArtifactName,
  getSecurityLabsUtcTimestampVersion,
  getSecurityLabsLegacyDateVersion,
  isValidSecurityLabsVersion,
  DEFAULT_ELSER,
} from './artifact';

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
  it('generates a name with inference id when inference_id is not the ELSER default', () => {
    expect(
      getArtifactName({
        productName: 'kibana',
        productVersion: '8.16',
        inferenceId: '.multilingual-e5-small-elasticsearch',
      })
    ).toEqual('kb-product-doc-kibana-8.16--.multilingual-e5-small-elasticsearch.zip');
    expect(
      getArtifactName({
        productName: 'kibana',
        productVersion: '8.16',
        inferenceId: '.multilingual-e5-small-elasticsearch',
        excludeExtension: true,
      })
    ).toEqual('kb-product-doc-kibana-8.16--.multilingual-e5-small-elasticsearch');
  });
  it('generates a name with inference id when inference_id is the ELSER default', () => {
    expect(
      getArtifactName({
        productName: 'kibana',
        productVersion: '8.16',
        inferenceId: DEFAULT_ELSER,
      })
    ).toEqual('kb-product-doc-kibana-8.16.zip');
  });
  it('generates a name with inference id for latest', () => {
    expect(
      getArtifactName({
        productName: 'kibana',
        productVersion: 'latest',
        inferenceId: DEFAULT_ELSER,
      })
    ).toEqual('kb-product-doc-kibana-latest.zip');
    expect(
      getArtifactName({
        productName: 'security',
        productVersion: 'latest',
        inferenceId: DEFAULT_ELSER,
      })
    ).toEqual('kb-product-doc-security-latest.zip');
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
  it('parses an artifact name latest', () => {
    expect(parseArtifactName('kb-product-doc-kibana-latest')).toEqual({
      productName: 'kibana',
      productVersion: 'latest',
    });

    expect(parseArtifactName('kb-product-doc-security-latest')).toEqual({
      productName: 'security',
      productVersion: 'latest',
    });
  });

  it('returns undefined if the provided string does not match the artifact name pattern', () => {
    expect(parseArtifactName('some-wrong-name')).toEqual(undefined);
  });

  it('returns undefined if the provided string is not strictly lowercase', () => {
    expect(parseArtifactName('kb-product-doc-Security-8.17')).toEqual(undefined);
  });
  it('parses an artifact name with inference id and extension', () => {
    expect(
      parseArtifactName('kb-product-doc-kibana-8.16--.multilingual-e5-small-elasticsearch.zip')
    ).toEqual({
      productName: 'kibana',
      productVersion: '8.16',
      inferenceId: '.multilingual-e5-small-elasticsearch',
    });
  });
  it('parses an artifact name with inference id when it is not the default', () => {
    expect(
      parseArtifactName('kb-product-doc-kibana-8.16--.multilingual-e5-small-elasticsearch')
    ).toEqual({
      productName: 'kibana',
      productVersion: '8.16',
      inferenceId: '.multilingual-e5-small-elasticsearch',
    });
  });
});

describe('getSecurityLabsUtcTimestampVersion', () => {
  it('formats a UTC timestamp as YYYY.MM.DD-HHMMSS', () => {
    expect(getSecurityLabsUtcTimestampVersion(new Date('2026-07-10T15:28:31.000Z'))).toBe(
      '2026.07.10-152831'
    );
  });
});

describe('getSecurityLabsLegacyDateVersion', () => {
  it('strips the HHMMSS suffix from a timestamp version', () => {
    expect(getSecurityLabsLegacyDateVersion('2026.07.10-152831')).toBe('2026.07.10');
  });

  it('returns undefined for date-only or invalid versions', () => {
    expect(getSecurityLabsLegacyDateVersion('2026.07.10')).toBeUndefined();
    expect(getSecurityLabsLegacyDateVersion('2026.07.10-1528')).toBeUndefined();
    expect(getSecurityLabsLegacyDateVersion('not-a-version')).toBeUndefined();
  });
});

describe('isValidSecurityLabsVersion', () => {
  it('accepts legacy date versions and UTC timestamp versions', () => {
    expect(isValidSecurityLabsVersion('2026.07.10')).toBe(true);
    expect(isValidSecurityLabsVersion('2026.07.10-152831')).toBe(true);
  });

  it('rejects invalid versions', () => {
    expect(isValidSecurityLabsVersion('2026-07-10')).toBe(false);
    expect(isValidSecurityLabsVersion('2026.07.10-1528')).toBe(false);
    expect(isValidSecurityLabsVersion('abc')).toBe(false);
  });
});

describe('getSecurityLabsArtifactName / parseSecurityLabsArtifactName', () => {
  it('builds and parses a UTC timestamp version artifact name', () => {
    expect(
      getSecurityLabsArtifactName({
        version: '2026.07.10-152831',
      })
    ).toEqual('security-labs-2026.07.10-152831.zip');

    expect(parseSecurityLabsArtifactName('security-labs-2026.07.10-152831.zip')).toEqual({
      version: '2026.07.10-152831',
      resourceType: 'security_labs',
    });
  });

  it('builds and parses a Jina artifact with a UTC timestamp version', () => {
    expect(
      getSecurityLabsArtifactName({
        version: '2026.07.10-152831',
        inferenceId: '.jina-embeddings-v5-text-small',
      })
    ).toEqual('security-labs-2026.07.10-152831--.jina-embeddings-v5-text-small.zip');

    expect(
      parseSecurityLabsArtifactName(
        'security-labs-2026.07.10-152831--.jina-embeddings-v5-text-small.zip'
      )
    ).toEqual({
      version: '2026.07.10-152831',
      inferenceId: '.jina-embeddings-v5-text-small',
      resourceType: 'security_labs',
    });
  });

  it('still parses legacy date-only artifact names', () => {
    expect(parseSecurityLabsArtifactName('security-labs-2025.12.12.zip')).toEqual({
      version: '2025.12.12',
      resourceType: 'security_labs',
    });
  });

  it('sorts timestamp versions after same-day legacy versions', () => {
    const versions = ['2026.07.10', '2026.07.10-090000', '2026.07.09-235959', '2026.07.10-152831'];
    expect([...versions].sort().reverse()[0]).toBe('2026.07.10-152831');
  });
});
