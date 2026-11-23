/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkAccess } from './stream_crud';
import { SecurityError } from './errors/security_error';
import { StreamsClient } from './client';

jest.mock('./stream_crud', () => {
  const actual = jest.requireActual('./stream_crud');
  return {
    ...actual,
    checkAccess: jest.fn(),
    checkAccessBulk: jest.fn(),
  };
});

const mockedCheckAccess = checkAccess as jest.MockedFunction<typeof checkAccess>;

const STREAM = 'logs.forbidden';

const makeClient = ({ isSecurityEnabled = true }: { isSecurityEnabled?: boolean } = {}) =>
  new StreamsClient({
    lockManager: {} as never,
    esClientAsInternalUser: {} as never,
    esClient: {} as never,
    attachmentClient: {} as never,
    storageClient: {} as never,
    logger: { error: jest.fn(), debug: jest.fn() } as never,
    isServerless: false,
    isSecurityEnabled,
    isWiredStreamViewsEnabled: false,
    isDev: false,
  });

describe('StreamsClient.assertReadAccess', () => {
  beforeEach(() => {
    mockedCheckAccess.mockReset();
  });

  it('throws SecurityError when the caller cannot read the stream', async () => {
    mockedCheckAccess.mockResolvedValue({ read: false, write: false });

    await expect(makeClient().assertReadAccess(STREAM)).rejects.toBeInstanceOf(SecurityError);
    expect(mockedCheckAccess).toHaveBeenCalledWith({
      name: STREAM,
      esClient: {},
      isSecurityEnabled: true,
    });
  });

  it('resolves when the caller can read the stream', async () => {
    mockedCheckAccess.mockResolvedValue({ read: true, write: false });

    await expect(makeClient().assertReadAccess(STREAM)).resolves.toBeUndefined();
  });

  it('skips the privilege check when security is disabled', async () => {
    await expect(makeClient({ isSecurityEnabled: false }).assertReadAccess(STREAM)).resolves.toBe(
      undefined
    );
    expect(mockedCheckAccess).not.toHaveBeenCalled();
  });
});
