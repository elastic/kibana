/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import type { SpecVersionsContract } from '../types';
import { ensureSpecVersionLoaded, resolveSpecVersionForCreate } from './spec_version';

const spec = { metadata: { id: '.abuseipdb' } } as ConnectorSpec;

const createContract = (overrides: Partial<SpecVersionsContract> = {}): SpecVersionsContract => ({
  getActiveVersion: () => '1.1.0',
  getActiveSpec: () => spec,
  getSpec: jest.fn(async (version?: string) => {
    if (version === undefined || version === '1.1.0' || version === '1.0.0') {
      return spec;
    }
    throw new Error(`definition:.abuseipdb@${version} not found`);
  }),
  hasVersion: (version) => version === '1.1.0' || version === '1.0.0',
  ...overrides,
});

describe('resolveSpecVersionForCreate', () => {
  it('returns undefined for classic types', async () => {
    await expect(resolveSpecVersionForCreate({ id: '.slack' }, undefined)).resolves.toBeUndefined();
  });

  it('rejects a requested version on a classic type', async () => {
    await expect(resolveSpecVersionForCreate({ id: '.slack' }, '1.0.0')).rejects.toThrow(
      'does not support spec versions'
    );
  });

  it('resolves to the active version when none is requested', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForCreate({ id: '.abuseipdb', specVersions }, undefined)
    ).resolves.toBe('1.1.0');
  });

  it('pins the requested version after loading it', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForCreate({ id: '.abuseipdb', specVersions }, '1.0.0')
    ).resolves.toBe('1.0.0');
    expect(specVersions.getSpec).toHaveBeenCalledWith('1.0.0');
  });

  it('returns 400 when the requested version cannot be obtained', async () => {
    const specVersions = createContract();
    await expect(
      resolveSpecVersionForCreate({ id: '.abuseipdb', specVersions }, '9.9.9')
    ).rejects.toMatchObject({
      output: { statusCode: 400 },
      message: expect.stringContaining('"9.9.9"'),
    });
  });
});

describe('ensureSpecVersionLoaded', () => {
  it('is a no-op for classic types and unpinned connectors', async () => {
    await expect(ensureSpecVersionLoaded({ id: '.slack' }, '1.0.0', 'c1')).resolves.toBeUndefined();
    await expect(
      ensureSpecVersionLoaded({ id: '.abuseipdb', specVersions: createContract() }, undefined, 'c1')
    ).resolves.toBeUndefined();
  });

  it('loads the pinned version', async () => {
    const specVersions = createContract();
    await ensureSpecVersionLoaded({ id: '.abuseipdb', specVersions }, '1.0.0', 'c1');
    expect(specVersions.getSpec).toHaveBeenCalledWith('1.0.0');
  });

  it('fails closed with connector id, type id and version in the message', async () => {
    await expect(
      ensureSpecVersionLoaded({ id: '.abuseipdb', specVersions: createContract() }, '9.9.9', 'c1')
    ).rejects.toThrow(
      'Connector "c1" of type ".abuseipdb" is pinned to spec version "9.9.9", which is not available'
    );
  });
});
