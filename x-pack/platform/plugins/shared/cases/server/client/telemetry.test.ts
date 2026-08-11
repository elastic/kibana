/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientInternalMock, createCasesClientMock } from './mocks';
import { newCase } from '../mocks';
import type { CasesClientArgs } from './types';
import { createCasesSubClient } from './cases/client';

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

  const mockIncrementCounter = jest.fn();

  const clientArgs = {
    usageCounter: { incrementCounter: mockIncrementCounter },
    clientSource: 'rest_api',
  } as unknown as CasesClientArgs;
  const mockCasesClient = createCasesClientMock();
  const mockCasesClientInternal = createCasesClientInternalMock();
  const client = createCasesSubClient(clientArgs, mockCasesClient, mockCasesClientInternal);

  it('should call incrementCounter with correct parameters', async () => {
    await client.create(newCase);
    expect(mockIncrementCounter).toHaveBeenCalledWith({
      counterName: 'create_case',
      counterType: 'cases_client.rest_api',
    });
  });

  it('resolve and get method are ignored from telemetry', async () => {
    await client.get({ id: '1' });
    await client.resolve({ id: '1' });
    expect(mockIncrementCounter).not.toHaveBeenCalledWith({
      counterName: 'get_case',
      counterType: 'cases_client.rest_api',
    });
    expect(mockIncrementCounter).not.toHaveBeenCalledWith({
      counterName: 'resolve_case',
      counterType: 'cases_client.rest_api',
    });
  });

  it('should not throw if usageCounter is undefined', async () => {
    const clientArgsWithoutUsageCounter = {
      clientSource: 'rest_api',
    } as unknown as CasesClientArgs;
    const clientWithoutUsageCounter = createCasesSubClient(
      clientArgsWithoutUsageCounter,
      mockCasesClient,
      mockCasesClientInternal
    );
    await expect(clientWithoutUsageCounter.create(newCase)).resolves.toEqual({ id: 123 });
  });
});
