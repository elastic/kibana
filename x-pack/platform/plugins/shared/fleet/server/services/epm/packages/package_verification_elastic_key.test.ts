/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

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

// Real package archives and signatures from the Elastic Package Registry, signed with the
// Elastic signing key (https://artifacts.elastic.co/GPG-KEY-elasticsearch).
const fixturesDir = path.join(__dirname, '__fixtures__', 'package_verification');
const readFixture = (fileName: string) => readFileSync(path.join(fixturesDir, fileName));
const elasticGpgKey = readFixture('GPG-KEY-elasticsearch');
const elasticGpgKeyId = 'd27d666cd88e42b4';

describe('verifyPackageArchiveSignature with the Elastic signing key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfig.mockReturnValue({ packageVerification: { gpgKeyPath: 'somePath' } });
    mockedReadFile.mockResolvedValue(elasticGpgKey);
  });

  // The Elastic key was reformatted from SHA1 to SHA256, and its self-signatures are dated
  // 2023-09-05. fleet_server 1.3.0 was signed before that, so verifying it relies on
  // `allowInsecureVerificationWithReformattedKeys`. fleet_server 1.6.1 was signed after.
  describe.each([
    ['1.3.0', 'signed before the key was reformatted'],
    ['1.6.1', 'signed after the key was reformatted'],
  ])('fleet_server %s (%s)', (pkgVersion) => {
    const pkgArchiveBuffer = readFixture(`fleet_server-${pkgVersion}.zip`);

    beforeEach(() => {
      mockedGetSignature.mockResolvedValue(
        readFixture(`fleet_server-${pkgVersion}.zip.sig`).toString('utf8')
      );
    });

    it('should return verified', async () => {
      const result = await verifyPackageArchiveSignature({
        pkgName: 'fleet_server',
        pkgVersion,
        pkgArchiveBuffer,
        logger: mockLogger,
      });

      expect(result).toEqual({
        verificationStatus: 'verified',
        verificationKeyId: elasticGpgKeyId,
      });
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return unverified if the package archive was modified', async () => {
      const tamperedBuffer = Buffer.concat([pkgArchiveBuffer, Buffer.from('tampered')]);

      const result = await verifyPackageArchiveSignature({
        pkgName: 'fleet_server',
        pkgVersion,
        pkgArchiveBuffer: tamperedBuffer,
        logger: mockLogger,
      });

      expect(result).toEqual({
        verificationStatus: 'unverified',
        verificationKeyId: elasticGpgKeyId,
      });
    });
  });
});
