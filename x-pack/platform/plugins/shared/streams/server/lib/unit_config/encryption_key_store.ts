/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { StatusError } from '../streams/errors/status_error';

export interface EncryptionKeyMaterial {
  kid: string;
  /** Raw AES-256 key. Callers zero it when done. */
  key: Buffer;
}

export interface EncryptionKeyStore {
  readCurrent: () => Promise<EncryptionKeyMaterial>;
}

const AES_256_KEY_BYTES = 32;
const KID_PATTERN = /^[0-9]{8}_[0-9]{6}_[a-f0-9]{8}$/;
const CURRENT_KID_FILE = 'current-kid';
const KEY_FILE_PREFIX = 'streams-encryption-key.';

const keyUnavailable = (message: string): StatusError =>
  new StatusError(`Cannot seal Streams unit credentials: ${message}`, 503);

// Only the errno code: the message repeats the mount path, and this error reaches API callers.
const errorCode = (error: unknown): string =>
  (error as NodeJS.ErrnoException | undefined)?.code ?? 'unknown error';

/** Reads the `streams-encryption-key` mount on every call, since the kubelet swaps it in place on rotation. */
export const createEncryptionKeyStore = ({ path }: { path: string }): EncryptionKeyStore => {
  const readCurrentKid = async (): Promise<string> => {
    const contents = await readFile(join(path, CURRENT_KID_FILE), 'utf8').catch((error) => {
      throw keyUnavailable(`cannot read ${CURRENT_KID_FILE} (${errorCode(error)})`);
    });
    const kid = contents.trim();

    // The kid becomes part of a file name, and the file contents are not echoed in case they hold key material.
    if (!KID_PATTERN.test(kid)) {
      throw keyUnavailable(`${CURRENT_KID_FILE} does not hold a well-formed kid`);
    }

    return kid;
  };

  const readKey = async (kid: string): Promise<Buffer> => {
    const keyFile = join(path, `${KEY_FILE_PREFIX}${kid}`);
    const key = await readFile(keyFile).catch((error) => {
      throw keyUnavailable(`key ${kid} is missing (${errorCode(error)})`);
    });

    if (key.length !== AES_256_KEY_BYTES) {
      key.fill(0);
      throw keyUnavailable(
        `key ${kid} is ${key.length} bytes, expected ${AES_256_KEY_BYTES} for AES-256`
      );
    }

    return key;
  };

  return {
    readCurrent: async () => {
      const kid = await readCurrentKid();
      return { kid, key: await readKey(kid) };
    },
  };
};
