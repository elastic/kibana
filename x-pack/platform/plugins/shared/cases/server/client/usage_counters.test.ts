/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCasesClientInternalMock,
  createCasesClientMock,
  createCasesClientMockArgs,
} from './mocks';
import { newCase } from '../mocks';
import { createCasesSubClient } from './cases/client';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import type { CasesClientSource } from './types';

jest.mock('./cases/create', () => ({ create: jest.fn().mockResolvedValue({ id: 123 }) }));
jest.mock('./cases/get', () => ({
  get: jest.fn().mockResolvedValue({}),
  resolve: jest.fn().mockResolvedValue({}),
  getCasesByAlertID: jest.fn().mockResolvedValue([]),
  getReporters: jest.fn().mockResolvedValue([]),
  getTags: jest.fn().mockResolvedValue([]),
  getCategories: jest.fn().mockResolvedValue([]),
}));

describe('withUsageCounter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const usageCounter = usageCollectionPluginMock.createSetupContract().createUsageCounter('cases');
  const clientArgs = {
    ...createCasesClientMockArgs(),
    usageCounter,
    clientSource: 'rest_api' as CasesClientSource,
  };
  const mockCasesClient = createCasesClientMock();
  const mockCasesClientInternal = createCasesClientInternalMock();
  const client = createCasesSubClient(clientArgs, mockCasesClient, mockCasesClientInternal);

  it('should call incrementCounter with correct parameters', async () => {
    await client.create(newCase);
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'create_case',
      counterType: 'cases_client.rest_api',
    });
  });

  it('resolve and get method are ignored from telemetry', async () => {
    await client.get({ id: '1' });
    await client.resolve({ id: '1' });
    expect(usageCounter.incrementCounter).not.toHaveBeenCalledWith({
      counterName: 'get_case',
      counterType: 'cases_client.rest_api',
    });
    expect(usageCounter.incrementCounter).not.toHaveBeenCalledWith({
      counterName: 'resolve_case',
      counterType: 'cases_client.rest_api',
    });
  });

  it('should not throw if usageCounter is undefined', async () => {
    const baseArgs = createCasesClientMockArgs();
    const clientWithoutUsageCounter = createCasesSubClient(
      baseArgs,
      mockCasesClient,
      mockCasesClientInternal
    );
    await expect(clientWithoutUsageCounter.create(newCase)).resolves.toEqual({ id: 123 });
  });
});
