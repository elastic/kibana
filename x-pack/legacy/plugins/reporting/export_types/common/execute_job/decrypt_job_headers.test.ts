/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cryptoFactory } from '../../../server/lib/crypto';
import { createMockServer } from '../../../test_helpers/create_mock_server';
import { Logger } from '../../../types';
import { decryptJobHeaders } from './decrypt_job_headers';

let mockServer: any;
beforeEach(() => {
  mockServer = createMockServer('');
});

const encryptHeaders = async (headers: Record<string, string>) => {
  const crypto = cryptoFactory(mockServer);
  return await crypto.encrypt(headers);
};

describe('headers', () => {
  test(`fails if it can't decrypt headers`, async () => {
    await expect(
      decryptJobHeaders({
        job: { headers: {} }, // FIXME isn't this the wrong type to pass to the decrypt function?
        logger: ({
          error: jest.fn(),
        } as unknown) as Logger,
        server: mockServer,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Failed to decrypt report job data. Please ensure that xpack.reporting.encryptionKey is set and re-generate this report. TypeError [ERR_INVALID_ARG_TYPE]: The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type object]`
    );
  });

  test(`passes back decrypted headers that were passed in`, async () => {
    const headers = {
      foo: 'bar',
      baz: 'quix',
    };

    const encryptedHeaders = await encryptHeaders(headers);
    const { decryptedHeaders } = await decryptJobHeaders({
      job: {
        title: 'cool-job-bro',
        type: 'csv',
        headers: encryptedHeaders,
      },
      logger: {} as Logger,
      server: mockServer,
    });
    expect(decryptedHeaders).toEqual(headers);
  });
});
