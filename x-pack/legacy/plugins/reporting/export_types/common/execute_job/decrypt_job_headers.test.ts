/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { cryptoFactory } from '../../../server/lib/crypto';
import { createMockServer } from '../../../test_helpers/create_mock_server';
import { Logger } from '../../../types';
import { decryptJobHeaders } from './decrypt_job_headers';

const createMockLogger = () =>
  (({
    warning: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as unknown) as Logger);

describe('headers', () => {
  let mockServer: any;
  const encryptHeaders = async (headers: Record<string, string>) => {
    const crypto = cryptoFactory(mockServer);
    return await crypto.encrypt(headers);
  };

  beforeEach(() => {
    mockServer = createMockServer('');
  });

  test(`fails if it can't decrypt headers`, async () => {
    await expect(
      decryptJobHeaders({
        job: {
          title: 'cool-job-bro',
          type: 'csv',
          jobParams: {
            savedObjectId: 'abc-123',
            isImmediate: false,
            savedObjectType: 'search',
          },
        },
        server: mockServer,
        logger: createMockLogger(),
      })
    ).rejects.toBeDefined();
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
        jobParams: {
          savedObjectId: 'abc-123',
          isImmediate: false,
          savedObjectType: 'search',
        },
        headers: encryptedHeaders,
      },
      server: mockServer,
      logger: createMockLogger(),
    });
    expect(decryptedHeaders).toEqual(headers);
  });
});
