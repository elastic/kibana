/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrowdStrikeSessionManager } from './rtr_session_manager';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { CrowdstrikeInitRTRResponseSchema } from '../../../common/crowdstrike/schema';

// There is a lot of logic in private fields/methods of CrowdStrikeSessionManager that we need to test.
class TestableCrowdStrikeSessionManager extends CrowdStrikeSessionManager {
  // Expose private fields
  public getCurrentBatchId(): string | null {
    return this.currentBatchId;
  }

  public getRefreshInterval(): NodeJS.Timeout | null {
    return this.refreshInterval;
  }

  public getCloseSessionTimeout(): NodeJS.Timeout | null {
    return this.closeSessionTimeout;
  }

  // Expose private methods
  public callStartRefreshInterval(connectorUsageCollector: ConnectorUsageCollector): void {
    this.startRefreshInterval(connectorUsageCollector);
  }

  public callResetCloseSessionTimeout(): void {
    this.resetCloseSessionTimeout();
  }

  public async callRefreshSession(connectorUsageCollector: ConnectorUsageCollector): Promise<void> {
    await this.refreshSession(connectorUsageCollector);
  }

  public async callTerminateSession(): Promise<void> {
    await this.terminateSession();
  }
}

jest.useFakeTimers();

describe('CrowdstrikeSessionManager', () => {
  const mockUrls = {
    batchInitRTRSession: 'https://api.example.com/init',
    batchRefreshRTRSession: 'https://api.example.com/refresh',
  };

  let mockApiRequest: jest.Mock;
  let mockConnectorUsageCollector: ConnectorUsageCollector;
  let sessionManager: TestableCrowdStrikeSessionManager;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks to reset timer calls

    mockApiRequest = jest.fn();
    mockConnectorUsageCollector = {} as ConnectorUsageCollector;

    sessionManager = new TestableCrowdStrikeSessionManager(mockUrls, mockApiRequest);
  });

  describe('initializeSession', () => {
    it('should initialize a session if no current batch ID exists', async () => {
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

      expect(result).toEqual('mock-batch-id');
      expect(sessionManager.getCurrentBatchId()).toEqual('mock-batch-id');
    });

    it('should reset the close session timeout after initialization', async () => {
      const mockResponse = { batch_id: 'mock-batch-id' };
      mockApiRequest.mockResolvedValueOnce(mockResponse);

      const payload = { endpoint_ids: ['endpoint1', 'endpoint2'] };
      await sessionManager.initializeSession(payload, mockConnectorUsageCollector);

      // Advance timers to simulate the timeout trigger
      jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

      expect(sessionManager.getCloseSessionTimeout()).toBeNull();
    });
  });

  describe('terminateSession', () => {
    it('should clear refresh interval and close session timeout', async () => {
      sessionManager.callResetCloseSessionTimeout();
      sessionManager.callStartRefreshInterval(mockConnectorUsageCollector);

      await sessionManager.callTerminateSession();

      // Verify both timers were cleared
      expect(sessionManager.getRefreshInterval()).toBeNull();
      expect(sessionManager.getCloseSessionTimeout()).toBeNull();
    });
  });

  describe('startRefreshInterval', () => {
    it('should start a new refresh interval', () => {
      sessionManager.callStartRefreshInterval(mockConnectorUsageCollector);

      // Simulate timer triggering
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      // Validate that `refreshSession` was called
      expect(mockApiRequest).toHaveBeenCalledWith(
        {
          url: mockUrls.batchRefreshRTRSession,
          method: 'post',
          data: { batch_id: null },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        mockConnectorUsageCollector
      );
    });

    it('should clear any existing refresh interval before starting a new one', () => {
      // Spy on clearInterval to verify it was called
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      expect(sessionManager.getRefreshInterval()).toBeNull();

      // Start the first interval
      sessionManager.callStartRefreshInterval(mockConnectorUsageCollector);
      const firstInterval = sessionManager.getRefreshInterval();
      expect(firstInterval).not.toBeNull();

      // Start another interval
      sessionManager.callStartRefreshInterval(mockConnectorUsageCollector);
      const secondInterval = sessionManager.getRefreshInterval();

      // Ensure a new interval was set
      expect(secondInterval).not.toBeNull();
      expect(secondInterval).not.toBe(firstInterval); // Verify the interval changed

      // Verify clearInterval was called with the first interval
      expect(clearIntervalSpy).toHaveBeenCalledWith(firstInterval);
    });
  });

  describe('resetCloseSessionTimeout', () => {
    it('should set a timeout to terminate the session after 10 minutes of inactivity', () => {
      sessionManager.callResetCloseSessionTimeout();

      // Fast forward time to simulate timeout execution
      jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

      // Ensure timeout was triggered
      expect(sessionManager.getCloseSessionTimeout()).toBeNull();
    });

    it('should clear any existing timeout before setting a new one', () => {
      // Set the first timeout
      sessionManager.callResetCloseSessionTimeout();

      const firstTimeout = sessionManager.getCloseSessionTimeout();
      expect(firstTimeout).not.toBeNull();

      // Set another timeout, which should replace the first one
      sessionManager.callResetCloseSessionTimeout();

      const secondTimeout = sessionManager.getCloseSessionTimeout();
      expect(secondTimeout).not.toBe(firstTimeout);

      // Simulate timeout expiration
      jest.advanceTimersByTime(10 * 60 * 1000); // 10 minutes
      expect(sessionManager.getCloseSessionTimeout()).toBeNull();
    });
  });
});
