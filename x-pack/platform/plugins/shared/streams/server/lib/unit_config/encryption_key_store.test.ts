/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createEncryptionKeyStore } from './encryption_key_store';

const KID = '20261014_101500_a3f19b2c';

// Mirrors how the kubelet projects a Secret: files live in a timestamped
// directory and are reached through the `..data` symlink.
const writeMount = async (dir: string, files: Record<string, string | Buffer>) => {
  const dataDir = '..2026_10_14_10_15_00.000000001';
  await mkdir(join(dir, dataDir));
  await symlink(dataDir, join(dir, '..data'));
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(join(dir, dataDir, name), contents);
    await symlink(join('..data', name), join(dir, name));
  }
};

describe('createEncryptionKeyStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'streams-encryption-key-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reads the current kid and its 32-byte key through a kubelet-style mount', async () => {
    const key = randomBytes(32);
    await writeMount(dir, {
      'current-kid': `${KID}\n`,
      [`streams-encryption-key.${KID}`]: key,
    });

    await expect(createEncryptionKeyStore({ path: dir }).readCurrent()).resolves.toEqual({
      kid: KID,
      key,
    });
  });

  it('rejects a malformed kid before using it in a file path', async () => {
    await writeMount(dir, { 'current-kid': '../../etc/passwd' });

    await expect(createEncryptionKeyStore({ path: dir }).readCurrent()).rejects.toMatchObject({
      statusCode: 503,
      message: 'Cannot seal Streams unit credentials: current-kid does not hold a well-formed kid',
    });
  });

  it.each([
    ['current-kid is missing', {}],
    ['the key file is missing', { 'current-kid': KID }],
    [
      'the key is not 32 bytes',
      { 'current-kid': KID, [`streams-encryption-key.${KID}`]: randomBytes(16) },
    ],
  ])(
    'returns 503 without the mount path when %s',
    async (_, files: Record<string, string | Buffer>) => {
      await writeMount(dir, files);

      const error = await createEncryptionKeyStore({ path: dir })
        .readCurrent()
        .catch((e: Error) => e);

      expect(error).toMatchObject({ statusCode: 503 });
      expect((error as Error).message).not.toContain(dir);
    }
  );
});
