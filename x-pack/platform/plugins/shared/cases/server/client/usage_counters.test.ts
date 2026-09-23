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
import { incrementCasesClientCounter, withUsageCounter } from './usage_counters';
import { createAttachmentsSubClient } from './attachments/client';

jest.mock('./cases/create', () => ({ create: jest.fn().mockResolvedValue({ id: 123 }) }));
jest.mock('./cases/get', () => ({
  get: jest.fn().mockResolvedValue({}),
  resolve: jest.fn().mockResolvedValue({}),
  getCasesByAlertID: jest.fn().mockResolvedValue([]),
  getReporters: jest.fn().mockResolvedValue([]),
  getTags: jest.fn().mockResolvedValue([]),
  getCategories: jest.fn().mockResolvedValue([]),
}));
jest.mock('./attachments/add', () => ({ addComment: jest.fn().mockResolvedValue({}) }));

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
  const attachmentClient = createAttachmentsSubClient(
    clientArgs,
    mockCasesClient,
    mockCasesClientInternal
  );

  it('wrapper function should forward arguments and return correct value', async () => {
    const operation = jest.fn().mockResolvedValue('result');
    const wrapped = withUsageCounter('create_case', clientArgs, operation);
    await expect(wrapped('argument')).resolves.toBe('result');
    expect(operation).toHaveBeenCalledWith('argument');
  });

  it('wrapper function should forward failures', async () => {
    const operationError = jest.fn().mockRejectedValue(new Error('failure'));
    const wrapped = withUsageCounter('create_case', clientArgs, operationError);
    await expect(wrapped('argument')).rejects.toThrow('failure');
    expect(operationError).toHaveBeenCalledWith('argument');
  });

  it('should call incrementCounter with correct parameters', async () => {
    await client.create(newCase);
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'create_case',
      counterType: 'cases_client.rest_api',
    });
  });

  it('should call incrementCounter for attachmets', async () => {
    await attachmentClient.add({
      caseId: '1',
      comment: { attachmentId: 'test', type: 'user', owner: 'security' },
    });
    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'add_attachment',
      counterType: 'cases_client.rest_api',
    });
  });

  it('resolve and get method are ignored from telemetry', async () => {
    await client.get({ id: '1' });
    await client.resolve({ id: '1' });
    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
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

describe('incrementCasesClientCounter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const usageCounter = usageCollectionPluginMock.createSetupContract().createUsageCounter('cases');
  const clientArgs = {
    ...createCasesClientMockArgs(),
    usageCounter,
    clientSource: 'connector' as CasesClientSource,
  };

  it('tags the counter with the calling source', () => {
    incrementCasesClientCounter(clientArgs, 'create_case_with_template');

    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'create_case_with_template',
      counterType: 'cases_client.connector',
    });
  });

  it('passes an explicit amount through', () => {
    incrementCasesClientCounter(clientArgs, 'create_case_with_template', 3);

    expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'create_case_with_template',
      counterType: 'cases_client.connector',
      incrementBy: 3,
    });
  });

  it('does not emit anything for an empty bucket', () => {
    incrementCasesClientCounter(clientArgs, 'create_case_with_template', 0);

    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(clientArgs.logger.warn).not.toHaveBeenCalled();
  });

  it('warns and emits nothing for a negative amount', () => {
    incrementCasesClientCounter(clientArgs, 'create_case_with_template', -1);

    expect(usageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(clientArgs.logger.warn).toHaveBeenCalledWith(
      'Skipped cases client counter "create_case_with_template": incrementBy must not be negative (received -1).'
    );
  });

  it('does not throw if usageCounter is undefined', () => {
    expect(() =>
      incrementCasesClientCounter(createCasesClientMockArgs(), 'create_case_with_template')
    ).not.toThrow();
  });
});
