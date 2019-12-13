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
        job: {
          headers: 'Q53+9A+zf+Xe+ceR/uB/aR/Sw/8e+M+qR+WiG+8z+EY+mo+HiU/zQL+Xn',
        },
        logger: ({
          error: jest.fn(),
        } as unknown) as Logger,
        server: mockServer,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Failed to decrypt report job data. Please ensure that xpack.reporting.encryptionKey is set and re-generate this report. Error: Invalid IV length]`
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
