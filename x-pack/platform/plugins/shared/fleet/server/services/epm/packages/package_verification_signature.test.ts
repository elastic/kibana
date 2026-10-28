/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import * as openpgp from 'openpgp';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import * as Registry from '../registry';

import { verifyPackageArchiveSignature } from './package_verification';

const mockLogger = loggingSystemMock.create().get('mock logger');
const mockGetConfig = jest.fn();

jest.mock('../../app_context', () => ({
  appContextService: {
    getConfig: () => mockGetConfig(),
    getLogger: () => mockLogger,
  },
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

jest.mock('../registry', () => ({
  getPackageArchiveSignatureOrUndefined: jest.fn(),
}));

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockedGetSignature = Registry.getPackageArchiveSignatureOrUndefined as jest.Mock;

describe('verifyPackageArchiveSignature', () => {
  const pkgArchiveBuffer = Buffer.from('package archive content');
  let publicKey: string;
  let keyId: string;
  let signature: string;

  const sign = async (privateKey: openpgp.PrivateKey, data: Buffer) =>
    (await openpgp.sign({
      message: await openpgp.createMessage({ binary: data }),
      signingKeys: privateKey,
      detached: true,
      format: 'armored',
    })) as string;

  beforeAll(async () => {
    const generated = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 2048,
      userIDs: [{ name: 'Test Signing Key', email: 'test@example.com' }],
      format: 'object',
    });
    publicKey = generated.publicKey.armor();
    keyId = generated.publicKey.getKeyID().toHex();
    signature = await sign(generated.privateKey, pkgArchiveBuffer);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });
    mockedReadFile.mockResolvedValue(Buffer.from(publicKey));
    mockedGetSignature.mockResolvedValue(signature);
  });

  // The key is cached at module level, so all tests share the key read by the first call
  it('should return verified for a valid signature', async () => {
    const result = await verifyPackageArchiveSignature({
      pkgName: 'test',
      pkgVersion: '1.0.0',
      pkgArchiveBuffer,
      logger: mockLogger,
    });

    expect(result).toEqual({ verificationStatus: 'verified', verificationKeyId: keyId });
  });

  it('should return unverified if the archive content was modified', async () => {
    const result = await verifyPackageArchiveSignature({
      pkgName: 'test',
      pkgVersion: '1.0.0',
      pkgArchiveBuffer: Buffer.from('tampered package archive content'),
      logger: mockLogger,
    });

    expect(result).toEqual({ verificationStatus: 'unverified', verificationKeyId: keyId });
  });

  it('should return unverified if the signature was made by another key', async () => {
    const other = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 2048,
      userIDs: [{ name: 'Other Key' }],
      format: 'object',
    });
    mockedGetSignature.mockResolvedValue(await sign(other.privateKey, pkgArchiveBuffer));

    const result = await verifyPackageArchiveSignature({
      pkgName: 'test',
      pkgVersion: '1.0.0',
      pkgArchiveBuffer,
      logger: mockLogger,
    });

    expect(result).toEqual({ verificationStatus: 'unverified', verificationKeyId: keyId });
  });
});
