/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { isOsqueryResponseActionAuthorized } from './check_response_action_authz';

describe('isOsqueryResponseActionAuthorized', () => {
  let request: KibanaRequest;
  let mockCoreStart: CoreStart;

  const createMockCoreStart = (capabilities: Record<string, boolean>): CoreStart =>
    ({
      capabilities: {
        resolveCapabilities: jest.fn().mockResolvedValue({
          osquery: capabilities,
        }),
      },
    } as unknown as CoreStart);

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
  });

  it('should return true when user has writeLiveQueries', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: true, runSavedQueries: false });

    const result = await isOsqueryResponseActionAuthorized(mockCoreStart, request, {});
    expect(result).toBe(true);
  });

  it('should return false when user lacks writeLiveQueries for direct query', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: false, runSavedQueries: false });

    const result = await isOsqueryResponseActionAuthorized(mockCoreStart, request, {});
    expect(result).toBe(false);
  });

  it('should return true when user has runSavedQueries with saved_query_id', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: false, runSavedQueries: true });

    const result = await isOsqueryResponseActionAuthorized(mockCoreStart, request, {
      saved_query_id: 'test-query-id',
    });
    expect(result).toBe(true);
  });

  it('should return true when user has runSavedQueries with pack_id', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: false, runSavedQueries: true });

    const result = await isOsqueryResponseActionAuthorized(mockCoreStart, request, {
      pack_id: 'test-pack-id',
    });
    expect(result).toBe(true);
  });

  it('should return false when user has runSavedQueries but no saved_query_id or pack_id', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: false, runSavedQueries: true });

    const result = await isOsqueryResponseActionAuthorized(mockCoreStart, request, {});
    expect(result).toBe(false);
  });

  it('should return false when user lacks both privileges with saved_query_id', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: false, runSavedQueries: false });

    const result = await isOsqueryResponseActionAuthorized(mockCoreStart, request, {
      saved_query_id: 'test-query-id',
    });
    expect(result).toBe(false);
  });

  it('should return true when user has writeLiveQueries regardless of saved_query_id', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: true, runSavedQueries: false });

    const result = await isOsqueryResponseActionAuthorized(mockCoreStart, request, {
      saved_query_id: 'test-query-id',
    });
    expect(result).toBe(true);
  });

  it('should call resolveCapabilities with the correct request and path', async () => {
    mockCoreStart = createMockCoreStart({ writeLiveQueries: true, runSavedQueries: false });

    await isOsqueryResponseActionAuthorized(mockCoreStart, request, {});

    expect(mockCoreStart.capabilities.resolveCapabilities).toHaveBeenCalledWith(request, {
      capabilityPath: 'osquery.*',
    });
  });
});
