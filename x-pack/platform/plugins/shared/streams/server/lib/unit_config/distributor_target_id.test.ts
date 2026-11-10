/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { loggerMock } from '@kbn/logging-mocks';
import { createTargetIdResolver, targetIdFromDnsNames } from './distributor_target_id';

const fixture = (name: string): string =>
  readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

describe('targetIdFromDnsNames', () => {
  it('reads the project id from a serverless SAN, case-insensitively', () => {
    expect(targetIdFromDnsNames(['EIDENT.dev.project.observability.type.10.organization'])).toBe(
      'dev'
    );
  });

  it('reads the deployment id from an ECH SAN', () => {
    expect(targetIdFromDnsNames(['dep-1.deployment.acct-9.account'])).toBe('dep-1');
  });

  it('ignores unrelated SANs and accepts repeats of the same target', () => {
    expect(
      targetIdFromDnsNames([
        'localhost',
        'eident.abc.project.es.type.1.organization',
        'abc.deployment.x.account',
      ])
    ).toBe('abc');
  });

  it.each([
    ['no supported SAN', ['localhost']],
    [
      'two different targets',
      ['eident.a.project.es.type.1.organization', 'b.deployment.x.account'],
    ],
    ['a target over 32 bytes', [`eident.${'a'.repeat(33)}.project.es.type.1.organization`]],
  ])('rejects %s', (_, dnsNames) => {
    expect(() => targetIdFromDnsNames(dnsNames)).toThrow();
  });
});

describe('createTargetIdResolver', () => {
  it('uses the certificate SAN, not the fallback', () => {
    const resolve = createTargetIdResolver({
      certificate: fixture('target_serverless.pem'),
      fallbackTargetId: 'other',
      logger: loggerMock.create(),
    });

    expect(resolve()).toBe('abc123');
  });

  it('uses the leaf of a certificate chain', () => {
    const resolve = createTargetIdResolver({
      certificate: fixture('target_ech.pem') + fixture('target_serverless.pem'),
      logger: loggerMock.create(),
    });

    expect(resolve()).toBe('dep-1');
  });

  it('fails closed with 503 when the certificate has no supported SAN, even with a fallback', () => {
    const resolve = createTargetIdResolver({
      certificate: fixture('target_none.pem'),
      fallbackTargetId: 'abc',
      logger: loggerMock.create(),
    });

    expect(() => resolve()).toThrow(expect.objectContaining({ statusCode: 503 }));
  });

  it('uses the fallback only when no certificate is configured, and logs it once', () => {
    const logger = loggerMock.create();
    const resolve = createTargetIdResolver({ fallbackTargetId: 'abcdef12', logger });

    expect(resolve()).toBe('abcdef12');
    expect(resolve()).toBe('abcdef12');
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no certificate and no fallback', undefined],
    ['an invalid fallback', 'Not_Valid'],
  ])('fails closed with 503 on %s', (_, fallbackTargetId) => {
    const resolve = createTargetIdResolver({ fallbackTargetId, logger: loggerMock.create() });

    expect(() => resolve()).toThrow(expect.objectContaining({ statusCode: 503 }));
  });

  it('names the invalid xpack.cloud.serverless.project_id instead of the missing certificate', () => {
    const resolve = createTargetIdResolver({
      fallbackTargetId: 'Not_Valid',
      logger: loggerMock.create(),
    });

    expect(() => resolve()).toThrow(
      'Cannot seal Streams unit credentials: xpack.cloud.serverless.project_id [Not_Valid] is not a valid target id'
    );
  });
});
