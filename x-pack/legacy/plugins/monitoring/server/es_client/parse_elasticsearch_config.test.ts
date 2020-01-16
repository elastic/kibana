/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockReadFileSync,
  mockReadPkcs12Keystore,
  mockReadPkcs12Truststore,
} from './parse_elasticsearch_config.test.mocks';

import { parseElasticsearchConfig } from './parse_elasticsearch_config';

const parse = (config: any) => {
  return parseElasticsearchConfig({
    get: () => config,
  });
};

describe('reads files', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockReadFileSync.mockImplementation((path: string) => `content-of-${path}`);
    mockReadPkcs12Keystore.mockReset();
    mockReadPkcs12Keystore.mockImplementation((path: string) => ({
      key: `content-of-${path}.key`,
      cert: `content-of-${path}.cert`,
      ca: [`content-of-${path}.ca`],
    }));
    mockReadPkcs12Truststore.mockReset();
    mockReadPkcs12Truststore.mockImplementation((path: string) => [`content-of-${path}`]);
  });

  it('reads certificate authorities when ssl.keystore.path is specified', () => {
    const configValue = parse({ ssl: { keystore: { path: 'some-path' } } });
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path.ca']);
  });

  it('reads certificate authorities when ssl.truststore.path is specified', () => {
    const configValue = parse({ ssl: { truststore: { path: 'some-path' } } });
    expect(mockReadPkcs12Truststore).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);
  });

  it('reads certificate authorities when ssl.certificateAuthorities is specified', () => {
    let configValue = parse({ ssl: { certificateAuthorities: 'some-path' } });
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = parse({ ssl: { certificateAuthorities: ['some-path'] } });
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual(['content-of-some-path']);

    mockReadFileSync.mockClear();
    configValue = parse({ ssl: { certificateAuthorities: ['some-path', 'another-path'] } });
    expect(mockReadFileSync).toHaveBeenCalledTimes(2);
    expect(configValue.ssl.certificateAuthorities).toEqual([
      'content-of-some-path',
      'content-of-another-path',
    ]);
  });

  it('reads certificate authorities when ssl.keystore.path, ssl.truststore.path, and ssl.certificateAuthorities are specified', () => {
    const configValue = parse({
      ssl: {
        keystore: { path: 'some-path' },
        truststore: { path: 'another-path' },
        certificateAuthorities: 'yet-another-path',
      },
    });
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(mockReadPkcs12Truststore).toHaveBeenCalledTimes(1);
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificateAuthorities).toEqual([
      'content-of-some-path.ca',
      'content-of-another-path',
      'content-of-yet-another-path',
    ]);
  });

  it('reads a private key and certificate when ssl.keystore.path is specified', () => {
    const configValue = parse({ ssl: { keystore: { path: 'some-path' } } });
    expect(mockReadPkcs12Keystore).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.key).toEqual('content-of-some-path.key');
    expect(configValue.ssl.certificate).toEqual('content-of-some-path.cert');
  });

  it('reads a private key when ssl.key is specified', () => {
    const configValue = parse({ ssl: { key: 'some-path' } });
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.key).toEqual('content-of-some-path');
  });

  it('reads a certificate when ssl.certificate is specified', () => {
    const configValue = parse({ ssl: { certificate: 'some-path' } });
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(configValue.ssl.certificate).toEqual('content-of-some-path');
  });
});

describe('throws when config is invalid', () => {
  beforeAll(() => {
    const realFs = jest.requireActual('fs');
    mockReadFileSync.mockImplementation((path: string) => realFs.readFileSync(path));
    const utils = jest.requireActual('../../../../../../src/core/utils');
    mockReadPkcs12Keystore.mockImplementation((path: string, password?: string) =>
      utils.readPkcs12Keystore(path, password)
    );
    mockReadPkcs12Truststore.mockImplementation((path: string, password?: string) =>
      utils.readPkcs12Truststore(path, password)
    );
  });

  it('throws if key is invalid', () => {
    const value = { ssl: { key: '/invalid/key' } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/key'"`
    );
  });

  it('throws if certificate is invalid', () => {
    const value = { ssl: { certificate: '/invalid/cert' } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/cert'"`
    );
  });

  it('throws if certificateAuthorities is invalid', () => {
    const value = { ssl: { certificateAuthorities: '/invalid/ca' } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/ca'"`
    );
  });

  it('throws if keystore path is invalid', () => {
    const value = { ssl: { keystore: { path: '/invalid/keystore' } } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/keystore'"`
    );
  });

  it('throws if keystore does not contain a key', () => {
    mockReadPkcs12Keystore.mockReturnValueOnce({});
    const value = { ssl: { keystore: { path: 'some-path' } } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"Did not find key in Elasticsearch keystore."`
    );
  });

  it('throws if keystore does not contain a certificate', () => {
    mockReadPkcs12Keystore.mockReturnValueOnce({ key: 'foo' });
    const value = { ssl: { keystore: { path: 'some-path' } } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"Did not find certificate in Elasticsearch keystore."`
    );
  });

  it('throws if truststore path is invalid', () => {
    const value = { ssl: { keystore: { path: '/invalid/truststore' } } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"ENOENT: no such file or directory, open '/invalid/truststore'"`
    );
  });

  it('throws if key and keystore.path are both specified', () => {
    const value = { ssl: { key: 'foo', keystore: { path: 'bar' } } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"[config validation of [xpack.monitoring.elasticsearch].ssl]: cannot use [key] when [keystore.path] is specified"`
    );
  });

  it('throws if certificate and keystore.path are both specified', () => {
    const value = { ssl: { certificate: 'foo', keystore: { path: 'bar' } } };
    expect(() => parse(value)).toThrowErrorMatchingInlineSnapshot(
      `"[config validation of [xpack.monitoring.elasticsearch].ssl]: cannot use [certificate] when [keystore.path] is specified"`
    );
  });
});
