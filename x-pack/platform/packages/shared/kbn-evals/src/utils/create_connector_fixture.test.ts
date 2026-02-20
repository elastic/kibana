/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 } from 'uuid';
import { AxiosError } from 'axios';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createConnectorFixture,
  getConnectorIdAsUuid,
  resolveConnectorId,
} from './create_connector_fixture';

describe('getConnectorIdAsUuid', () => {
  it('returns a valid UUID v5 for a given connector id', () => {
    const result = getConnectorIdAsUuid('my-connector');
    // UUID v5 format: 8-4-4-4-12 hex chars
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns the same UUID for the same input (deterministic)', () => {
    const first = getConnectorIdAsUuid('my-connector');
    const second = getConnectorIdAsUuid('my-connector');
    expect(first).toBe(second);
  });

  it('returns different UUIDs for different inputs', () => {
    const a = getConnectorIdAsUuid('connector-a');
    const b = getConnectorIdAsUuid('connector-b');
    expect(a).not.toBe(b);
  });
});

describe('resolveConnectorId', () => {
  afterEach(() => {
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;
  });

  it('returns a UUID when KBN_EVALS_SKIP_CONNECTOR_SETUP is not set', () => {
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;

    const result = resolveConnectorId('my-connector');
    expect(result).toBe(getConnectorIdAsUuid('my-connector'));
  });

  it('returns the original id when KBN_EVALS_SKIP_CONNECTOR_SETUP is set', () => {
    process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP = 'true';

    const result = resolveConnectorId('my-connector');
    expect(result).toBe('my-connector');
  });
});

describe('createConnectorFixture', () => {
  const predefinedConnector: AvailableConnectorWithId = {
    id: 'my-test-connector',
    name: 'Test Connector',
    actionTypeId: '.gen-ai',
    config: { apiUrl: 'https://example.com' },
    secrets: { apiKey: 'secret-key' },
  };

  const expectedUuid = v5(predefinedConnector.id, v5.DNS);

  let mockFetch: jest.Mock;
  let mockLog: jest.Mocked<ToolingLog>;
  let mockUse: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;
    mockFetch = jest.fn().mockResolvedValue(undefined);
    mockLog = {
      info: jest.fn(),
      debug: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
    } as any;
    mockUse = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP;
  });

  it('deletes existing connector before creating a new one', async () => {
    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    // First call: DELETE (setup cleanup)
    expect(mockFetch).toHaveBeenNthCalledWith(1, {
      path: `/api/actions/connector/${expectedUuid}`,
      method: 'DELETE',
    });

    // Second call: POST (create)
    expect(mockFetch).toHaveBeenNthCalledWith(2, {
      path: `/api/actions/connector/${expectedUuid}`,
      method: 'POST',
      body: JSON.stringify({
        config: predefinedConnector.config,
        connector_type_id: predefinedConnector.actionTypeId,
        name: predefinedConnector.name,
        secrets: predefinedConnector.secrets,
      }),
    });
  });

  it('generates a deterministic UUID for the connector id', async () => {
    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    // The POST path uses the UUID-ified id
    const postCall = mockFetch.mock.calls.find(
      ([arg]: [{ method: string }]) => arg.method === 'POST'
    );
    expect(postCall).toBeDefined();
    expect(postCall![0].path).toBe(`/api/actions/connector/${expectedUuid}`);
  });

  it('calls use() with the UUID-ified connector', async () => {
    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    expect(mockUse).toHaveBeenCalledWith({
      ...predefinedConnector,
      id: expectedUuid,
    });
  });

  it('deletes the connector on teardown after use()', async () => {
    const callOrder: string[] = [];

    mockFetch.mockImplementation(async ({ method }: { method: string }) => {
      callOrder.push(method);
    });

    mockUse.mockImplementation(async () => {
      callOrder.push('use');
    });

    await createConnectorFixture({
      predefinedConnector,
      fetch: mockFetch,
      log: mockLog,
      use: mockUse,
    });

    // Order: DELETE (cleanup), POST (create), use(), DELETE (teardown)
    expect(callOrder).toEqual(['DELETE', 'POST', 'use', 'DELETE']);
  });

  it('swallows 404 errors on delete', async () => {
    const axiosError = new AxiosError('Not Found', '404', undefined, undefined, {
      status: 404,
      data: {},
      headers: {},
      statusText: 'Not Found',
      config: {} as any,
    });

    // First call (setup delete) rejects with 404, rest succeed
    mockFetch.mockRejectedValueOnce(axiosError).mockResolvedValue(undefined);

    await expect(
      createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      })
    ).resolves.toBeUndefined();

    // Should still proceed to POST and use()
    expect(mockUse).toHaveBeenCalled();
  });

  it('throws non-404 errors on delete', async () => {
    const serverError = new AxiosError('Internal Server Error', '500', undefined, undefined, {
      status: 500,
      data: {},
      headers: {},
      statusText: 'Internal Server Error',
      config: {} as any,
    });

    mockFetch.mockRejectedValueOnce(serverError);

    await expect(
      createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      })
    ).rejects.toThrow('Internal Server Error');

    // Should not proceed to use()
    expect(mockUse).not.toHaveBeenCalled();
  });

  describe('when KBN_EVALS_SKIP_CONNECTOR_SETUP is set', () => {
    beforeEach(() => {
      process.env.KBN_EVALS_SKIP_CONNECTOR_SETUP = 'true';
    });

    it('skips setup/teardown and calls use() with the predefined connector as-is', async () => {
      await createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUse).toHaveBeenCalledWith(predefinedConnector);
    });

    it('logs a message indicating connector setup is being skipped', async () => {
      await createConnectorFixture({
        predefinedConnector,
        fetch: mockFetch,
        log: mockLog,
        use: mockUse,
      });

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('Skipping connector setup/teardown')
      );
      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining(predefinedConnector.id));
    });
  });
});
