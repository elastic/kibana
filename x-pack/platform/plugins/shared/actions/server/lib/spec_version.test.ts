/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import type { SpecVersionsContract } from '../types';
import { SpecVersionRequestError } from './errors/spec_version_request_error';
import {
  ensureSpecVersionLoaded,
  resolveSpecVersionForCreate,
  resolveSpecVersionForUpdate,
} from './spec_version';

const spec = { metadata: { id: '.abuseipdb' } } as ConnectorSpec;

const createContract = (overrides: Partial<SpecVersionsContract> = {}): SpecVersionsContract => ({
  getLatestVersions: () => ({ '1': '1.1', '2': '2.0' }),
  getLatestVersion: (major) => {
    if (major === undefined) {
      return '2.0';
    }
    return major === 1 ? '1.1' : major === 2 ? '2.0' : undefined;
  },
  getSpec: jest.fn(async (version: string) => {
    if (version === '1.0' || version === '1.1' || version === '2.0') {
      return spec;
    }
    throw new SpecVersionRequestError({
      reason: 'not_stored',
      actionTypeId: '.abuseipdb',
      requested: version,
      message: `Spec version "${version}" of connector type ".abuseipdb" is not stored in this cluster; retry after the next catalog reload or check that it exists`,
    });
  }),
  hasVersion: (version) => version === '1.0' || version === '1.1' || version === '2.0',
  resolveRequest: jest.fn(async (request?: string, currentMajor?: number) => {
    if (request === undefined) {
      return currentMajor === 2 ? '2.0' : '1.1';
    }
    if (request === '2') {
      return '2.0';
    }
    if (request === '1' || request === '1.1') {
      return request === '1' ? '1.1' : '1.1';
    }
    if (request === '1.0' || request === '2.0') {
      return request;
    }
    throw new SpecVersionRequestError({
      reason: 'not_stored',
      actionTypeId: '.abuseipdb',
      requested: request,
      message: `Spec version "${request}" of connector type ".abuseipdb" is not stored in this cluster; retry after the next catalog reload or check that it exists`,
    });
  }),
  ...overrides,
});

describe('resolveSpecVersionForCreate', () => {
  it('returns undefined for classic types', async () => {
    await expect(resolveSpecVersionForCreate({ id: '.slack' }, undefined)).resolves.toBeUndefined();
  });

  it('rejects a requested version on a classic type', async () => {
    await expect(resolveSpecVersionForCreate({ id: '.slack' }, '1.0')).rejects.toThrow(
      'does not support spec versions'
    );
  });

  it('resolves omitted requests to the newest accepted 1.y even when a 2.x exists', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForCreate({ id: '.abuseipdb', specVersions }, undefined)
    ).resolves.toBe('1.1');
    expect(specVersions.resolveRequest).toHaveBeenCalledWith(undefined);
  });

  it('pins an exact stored version', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForCreate({ id: '.abuseipdb', specVersions }, '1.0')
    ).resolves.toBe('1.0');
  });

  it('returns 400 naming the version when it is not stored', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForCreate({ id: '.abuseipdb', specVersions }, '9.9')
    ).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: expect.stringContaining(
        'is not stored in this cluster; retry after the next catalog reload or check that it exists'
      ),
    });
  });
});

describe('resolveSpecVersionForUpdate', () => {
  it('stays on the current major when spec_version is omitted', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForUpdate({ id: '.abuseipdb', specVersions }, undefined, '1.0')
    ).resolves.toBe('1.1');
    expect(specVersions.resolveRequest).toHaveBeenCalledWith(undefined, 1);
  });

  it('treats an absent pin as major 1', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForUpdate({ id: '.abuseipdb', specVersions }, undefined, undefined)
    ).resolves.toBe('1.1');
    expect(specVersions.resolveRequest).toHaveBeenCalledWith(undefined, 1);
  });

  it('accepts an exact version of another major', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForUpdate({ id: '.abuseipdb', specVersions }, '2.0', '1.0')
    ).resolves.toBe('2.0');
  });

  it('rejects a requested version on a classic type', async () => {
    await expect(resolveSpecVersionForUpdate({ id: '.slack' }, '1.0', undefined)).rejects.toThrow(
      'does not support spec versions'
    );
  });
});

describe('ensureSpecVersionLoaded', () => {
  it('is a no-op for classic types and unpinned connectors', async () => {
    await expect(ensureSpecVersionLoaded({ id: '.slack' }, '1.0', 'c1')).resolves.toBeUndefined();
    await expect(
      ensureSpecVersionLoaded({ id: '.abuseipdb', specVersions: createContract() }, undefined, 'c1')
    ).resolves.toBeUndefined();
  });

  it('loads the pinned version', async () => {
    const specVersions = createContract();
    await ensureSpecVersionLoaded({ id: '.abuseipdb', specVersions }, '1.0', 'c1');
    expect(specVersions.getSpec).toHaveBeenCalledWith('1.0');
  });

  it('fails closed with connector id, type id and version in the message', async () => {
    await expect(
      ensureSpecVersionLoaded({ id: '.abuseipdb', specVersions: createContract() }, '9.9', 'c1')
    ).rejects.toThrow(
      'Connector "c1" of type ".abuseipdb" is pinned to spec version "9.9", which is not available'
    );
  });
});
