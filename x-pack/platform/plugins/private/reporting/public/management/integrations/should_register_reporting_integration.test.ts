/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryClient } from '../../query_client';
import { shouldRegisterReportingIntegration } from './should_register_reporting_integration';

jest.mock('../hooks/use_get_reporting_health_query', () => ({
  getKey: jest.fn(() => 'reportingHealthKey'),
}));
jest.mock('../apis/get_reporting_health', () => ({
  getReportingHealth: jest.fn(),
}));

describe('shouldRegisterReportingIntegration', () => {
  const http = {} as any;
  let fetchQuerySpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    if (fetchQuerySpy) {
      fetchQuerySpy.mockRestore();
    }
    fetchQuerySpy = jest.spyOn(queryClient, 'fetchQuery');
  });

  it('should return true when secure and has encryption key', async () => {
    fetchQuerySpy.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    });
    await expect(shouldRegisterReportingIntegration(http)).resolves.toBe(true);
  });

  it('should return false when not secure', async () => {
    fetchQuerySpy.mockResolvedValue({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: true,
    });
    await expect(shouldRegisterReportingIntegration(http)).resolves.toBe(false);
  });

  it('should return false when no encryption key', async () => {
    fetchQuerySpy.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    });
    await expect(shouldRegisterReportingIntegration(http)).resolves.toBe(false);
  });
});
