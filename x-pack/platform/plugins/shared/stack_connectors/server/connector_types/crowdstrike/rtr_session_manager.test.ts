/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrowdStrikeSessionManager } from './rtr_session_manager';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { CrowdstrikeInitRTRResponseSchema } from '../../../common/crowdstrike/schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

jest.useFakeTimers();

describe('CrowdstrikeSessionManager', () => {
  const mockUrls = {
    batchInitRTRSession: 'https://api.example.com/init',
    batchRefreshRTRSession: 'https://api.example.com/refresh',
  };

  let mockApiRequest: jest.Mock;
  let mockConnectorUsageCollector: ConnectorUsageCollector;
  let sessionManager: CrowdStrikeSessionManager;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    mockApiRequest = jest.fn();
    mockConnectorUsageCollector = {} as ConnectorUsageCollector;
    logger = loggingSystemMock.createLogger();

    sessionManager = new CrowdStrikeSessionManager(mockUrls, mockApiRequest, logger);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('initializeSession', () => {
    it('should initialize a new session successfully', async () => {
      const mockResponse = { batch_id: 'mock-batch-id' };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const payload = { endpoint_ids: ['endpoint1', 'endpoint2'] };
      const result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);

      expect(mockApiRequest).toHaveBeenCalledWith(
        {
          url: mockUrls.batchInitRTRSession,
          method: 'post',
          data: { host_ids: payload.endpoint_ids },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        mockConnectorUsageCollector
      );

      expect(result).toBe('mock-batch-id');
    });

    it('should reuse existing session on subsequent calls', async () => {
      // First initialization
      const mockResponse = { batch_id: 'existing-batch-id' };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const payload = { endpoint_ids: ['endpoint1'] };
      const firstResult = await sessionManager.initializeSession(
        payload,
        mockConnectorUsageCollector
      );
      expect(firstResult).toBe('existing-batch-id');
      expect(mockApiRequest).toHaveBeenCalledTimes(1);

      // Second initialization - should reuse session
      const secondResult = await sessionManager.initializeSession(
        payload,
        mockConnectorUsageCollector
      );
      expect(secondResult).toBe('existing-batch-id');
      expect(mockApiRequest).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should handle API failure during initialization', async () => {
      const mockError = new Error('Session initialization failed');
      mockApiRequest.mockRejectedValueOnce(mockError);

      const payload = { endpoint_ids: ['endpoint1', 'endpoint2'] };

      await expect(
        sessionManager.initializeSession(payload, mockConnectorUsageCollector)
      ).rejects.toThrow('Session initialization failed');
    });

    it('should handle invalid batch_id in API response', async () => {
      const mockResponse = { batch_id: null };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const payload = { endpoint_ids: ['endpoint1', 'endpoint2'] };

      await expect(
        sessionManager.initializeSession(payload, mockConnectorUsageCollector)
      ).rejects.toThrow('Invalid batch_id received from CrowdStrike API');
    });

    it('should handle missing batch_id in API response', async () => {
      const mockResponse = {};
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const payload = { endpoint_ids: ['endpoint1', 'endpoint2'] };

      await expect(
        sessionManager.initializeSession(payload, mockConnectorUsageCollector)
      ).rejects.toThrow('Invalid batch_id received from CrowdStrike API');
    });

    it('should handle non-string batch_id in API response', async () => {
      const mockResponse = { batch_id: 12345 };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const payload = { endpoint_ids: ['endpoint1'] };

      await expect(
        sessionManager.initializeSession(payload, mockConnectorUsageCollector)
      ).rejects.toThrow('Invalid batch_id received from CrowdStrike API');
    });

    it('should allow new session initialization after previous failure', async () => {
      const payload = { endpoint_ids: ['endpoint1'] };

      // First attempt fails
      mockApiRequest.mockRejectedValueOnce(new Error('First attempt failed'));
      await expect(
        sessionManager.initializeSession(payload, mockConnectorUsageCollector)
      ).rejects.toThrow('First attempt failed');

      // Second attempt succeeds
      const successResponse = { batch_id: 'success-batch-id' };
      mockApiRequest.mockResolvedValueOnce(successResponse);
      const result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);

      expect(result).toBe('success-batch-id');
    });
  });

  describe('session refresh behavior', () => {
    it('should automatically refresh the session every 5 minutes', async () => {
      // Initialize session first
      const initResponse = { batch_id: 'test-batch-id' };
      mockApiRequest.mockResolvedValueOnce(initResponse);

      const payload = { endpoint_ids: ['endpoint1'] };
      await sessionManager.initializeSession(payload, mockConnectorUsageCollector);

      // Clear initial call to focus on refresh calls
      mockApiRequest.mockClear();

      // Mock successful refresh response
      const refreshResponse = { batch_id: 'test-batch-id' };
      mockApiRequest.mockResolvedValue(refreshResponse);

      // Advance time to trigger first refresh (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);
      await jest.runOnlyPendingTimers();

      expect(mockApiRequest).toHaveBeenCalledWith(
        {
          url: mockUrls.batchRefreshRTRSession,
          method: 'post',
          data: { batch_id: 'test-batch-id' },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        mockConnectorUsageCollector
      );

      // Advance time for second refresh
      jest.advanceTimersByTime(5 * 60 * 1000);
      await jest.runOnlyPendingTimers();

      expect(mockApiRequest).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh failures gracefully and allow new session initialization', async () => {
      // Initialize session first
      const initResponse = { batch_id: 'test-batch-id' };
      mockApiRequest.mockResolvedValueOnce(initResponse);

      const payload = { endpoint_ids: ['endpoint1'] };
      await sessionManager.initializeSession(payload, mockConnectorUsageCollector);

      // Mock refresh failure
      mockApiRequest.mockRejectedValueOnce(new Error('Refresh failed'));

      // Trigger refresh interval - this should clear the session on failure
      jest.advanceTimersByTime(5 * 60 * 1000);
      await jest.runOnlyPendingTimers();

      // Should be able to initialize a new session after refresh failure
      const newInitResponse = { batch_id: 'new-batch-id' };
      mockApiRequest.mockResolvedValueOnce(newInitResponse);

      const result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('new-batch-id');

      // Verify it was a new initialization (not reusing session)
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        {
          url: mockUrls.batchInitRTRSession,
          method: 'post',
          data: { host_ids: payload.endpoint_ids },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        mockConnectorUsageCollector
      );
    });

    it('should handle invalid refresh response and allow session recovery', async () => {
      // Initialize session first
      const initResponse = { batch_id: 'test-batch-id' };
      mockApiRequest.mockResolvedValueOnce(initResponse);

      const payload = { endpoint_ids: ['endpoint1'] };
      await sessionManager.initializeSession(payload, mockConnectorUsageCollector);

      // Clear initial call and mock invalid refresh response
      mockApiRequest.mockClear();
      mockApiRequest.mockResolvedValueOnce({ batch_id: 'wrong-batch-id' });

      // Trigger refresh interval
      jest.advanceTimersByTime(5 * 60 * 1000);
      await jest.runOnlyPendingTimers();

      // Should be able to recover by initializing new session
      const recoveryResponse = { batch_id: 'recovery-batch-id' };
      mockApiRequest.mockResolvedValueOnce(recoveryResponse);

      const result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('recovery-batch-id');
    });
  });

  describe('session timeout behavior', () => {
    it('should terminate session after 10 minutes of inactivity', async () => {
      // Initialize session
      const mockResponse = { batch_id: 'timeout-batch-id' };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const payload = { endpoint_ids: ['endpoint1'] };
      await sessionManager.initializeSession(payload, mockConnectorUsageCollector);

      // Verify session is active by attempting reuse
      let result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('timeout-batch-id');
      expect(mockApiRequest).toHaveBeenCalledTimes(1); // Only initial call

      // Advance time to trigger timeout (10 minutes)
      // Note: This will also trigger refresh intervals (at 5 minutes), so we need to mock them
      mockApiRequest.mockResolvedValue({ batch_id: 'timeout-batch-id' }); // For refresh calls

      jest.advanceTimersByTime(10 * 60 * 1000);
      await jest.runOnlyPendingTimers();

      // Session should be terminated - new initialization should create new session
      const newSessionResponse = { batch_id: 'new-session-after-timeout' };
      mockApiRequest.mockResolvedValueOnce(newSessionResponse);

      result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('new-session-after-timeout');

      // Verify it was a new initialization (not reusing session)
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        {
          url: mockUrls.batchInitRTRSession,
          method: 'post',
          data: { host_ids: payload.endpoint_ids },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        mockConnectorUsageCollector
      );
    });

    it('should reset timeout on each session access', async () => {
      // Initialize session and mock all refresh calls
      const mockResponse = { batch_id: 'reset-timeout-batch-id' };
      mockApiRequest.mockResolvedValue(mockResponse); // This handles both init and refresh calls

      const payload = { endpoint_ids: ['endpoint1'] };
      await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(mockApiRequest).toHaveBeenCalledTimes(1);

      // Access session after 9 minutes (before timeout) - this should reset the timeout
      jest.advanceTimersByTime(9 * 60 * 1000);
      await jest.runOnlyPendingTimers(); // Process any refresh intervals

      let result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('reset-timeout-batch-id');

      // Wait another 9 minutes (timeout should be reset) - session should still be active
      jest.advanceTimersByTime(9 * 60 * 1000);
      await jest.runOnlyPendingTimers(); // Process any refresh intervals

      result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('reset-timeout-batch-id');

      // Finally wait full 10 minutes to trigger timeout
      jest.advanceTimersByTime(10 * 60 * 1000);
      await jest.runOnlyPendingTimers();

      // Now session should be terminated - next call should create new session
      const newSessionResponse = { batch_id: 'after-final-timeout' };
      mockApiRequest.mockResolvedValueOnce(newSessionResponse);

      result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('after-final-timeout');

      // Verify it was a new initialization
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        {
          url: mockUrls.batchInitRTRSession,
          method: 'post',
          data: { host_ids: payload.endpoint_ids },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        mockConnectorUsageCollector
      );
    });
  });

  describe('session lifecycle integration', () => {
    it('should handle complete session lifecycle with refresh and timeout', async () => {
      const payload = { endpoint_ids: ['endpoint1'] };

      // 1. Initialize session and mock all subsequent calls
      const initResponse = { batch_id: 'lifecycle-batch-id' };
      mockApiRequest.mockResolvedValue(initResponse); // This handles both init and refresh calls

      const sessionId = await sessionManager.initializeSession(
        payload,
        mockConnectorUsageCollector
      );
      expect(sessionId).toBe('lifecycle-batch-id');
      expect(mockApiRequest).toHaveBeenCalledTimes(1);

      // 2. Verify refresh happens after 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
      await jest.runOnlyPendingTimers();

      expect(mockApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: mockUrls.batchRefreshRTRSession,
          data: { batch_id: 'lifecycle-batch-id' },
        }),
        mockConnectorUsageCollector
      );

      // 3. Session should still be reusable immediately after refresh
      const reuseResult = await sessionManager.initializeSession(
        payload,
        mockConnectorUsageCollector
      );
      expect(reuseResult).toBe('lifecycle-batch-id');

      // 4. Timeout should terminate session after 10 minutes
      jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      await jest.runOnlyPendingTimers();

      // 5. New session should be created after timeout
      const newSessionResponse = { batch_id: 'new-after-timeout' };
      mockApiRequest.mockResolvedValueOnce(newSessionResponse);

      const newSessionId = await sessionManager.initializeSession(
        payload,
        mockConnectorUsageCollector
      );
      expect(newSessionId).toBe('new-after-timeout');

      // Verify it was a new initialization
      expect(mockApiRequest).toHaveBeenLastCalledWith(
        {
          url: mockUrls.batchInitRTRSession,
          method: 'post',
          data: { host_ids: payload.endpoint_ids },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        mockConnectorUsageCollector
      );
    });

    it('should handle session recovery after various failure scenarios', async () => {
      const payload = { endpoint_ids: ['endpoint1'] };

      // Test recovery after initialization failure
      mockApiRequest.mockRejectedValueOnce(new Error('Init failed'));
      await expect(
        sessionManager.initializeSession(payload, mockConnectorUsageCollector)
      ).rejects.toThrow('Init failed');

      // Should be able to initialize after failure
      const successResponse = { batch_id: 'recovered-session' };
      mockApiRequest.mockResolvedValueOnce(successResponse);

      let result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('recovered-session');

      // Test recovery after refresh failure
      mockApiRequest.mockClear();
      mockApiRequest.mockRejectedValueOnce(new Error('Refresh failed'));

      jest.advanceTimersByTime(5 * 60 * 1000);
      await jest.runOnlyPendingTimers();

      // Should be able to create new session after refresh failure
      const afterRefreshFailure = { batch_id: 'after-refresh-failure' };
      mockApiRequest.mockResolvedValueOnce(afterRefreshFailure);

      result = await sessionManager.initializeSession(payload, mockConnectorUsageCollector);
      expect(result).toBe('after-refresh-failure');
    });
  });
});
