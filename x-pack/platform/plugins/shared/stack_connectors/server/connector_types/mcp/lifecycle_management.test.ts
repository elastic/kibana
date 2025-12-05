/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { McpClient } from '@kbn/mcp-client';
import { DEFAULT_INACTIVITY_TIMEOUT_MS } from '@kbn/connector-schemas/mcp/constants';
import { McpConnectionLifecycleManager } from './lifecycle_management';

jest.useFakeTimers();

describe('McpConnectionLifecycleManager', () => {
  let mockMcpClient: jest.Mocked<McpClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let lifecycleManager: McpConnectionLifecycleManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    mockMcpClient = {
      isConnected: jest.fn().mockReturnValue(true),
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<McpClient>;

    logger = loggingSystemMock.createLogger();
    lifecycleManager = new McpConnectionLifecycleManager(mockMcpClient, logger);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default timeout', () => {
      const manager = new McpConnectionLifecycleManager(mockMcpClient, logger);
      expect(manager).toBeInstanceOf(McpConnectionLifecycleManager);
    });

    it('should initialize with custom timeout', () => {
      const customTimeout = 5000;
      const manager = new McpConnectionLifecycleManager(
        mockMcpClient,
        logger,
        customTimeout
      );
      expect(manager).toBeInstanceOf(McpConnectionLifecycleManager);
    });
  });

  describe('recordActivity', () => {
    it('should record activity and log debug message', () => {
      lifecycleManager.recordActivity();

      expect(logger.debug).toHaveBeenCalledWith('Recorded MCP connection activity');
    });

    it('should reset inactivity timeout when recording activity', () => {
      lifecycleManager.recordActivity();

      // Verify timeout was scheduled
      expect(jest.getTimerCount()).toBe(1);
    });

    it('should clear existing timeout before scheduling new one', () => {
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1);

      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1); // Should still be 1, not 2
    });

    it('should not schedule timeout if client is not connected', () => {
      mockMcpClient.isConnected.mockReturnValue(false);

      lifecycleManager.recordActivity();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('shouldDisconnect', () => {
    it('should return false when no activity has been recorded', () => {
      expect(lifecycleManager.shouldDisconnect()).toBe(false);
    });

    it('should return false when time since last activity is less than timeout', () => {
      lifecycleManager.recordActivity();

      // Advance time by less than the timeout
      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS - 1000);

      expect(lifecycleManager.shouldDisconnect()).toBe(false);
    });

    it('should return true when time since last activity equals timeout', () => {
      lifecycleManager.recordActivity();

      // Advance time by exactly the timeout
      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);

      expect(lifecycleManager.shouldDisconnect()).toBe(true);
    });

    it('should return true when time since last activity exceeds timeout', () => {
      lifecycleManager.recordActivity();

      // Advance time by more than the timeout
      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS + 1000);

      expect(lifecycleManager.shouldDisconnect()).toBe(true);
    });

    it('should return false after reset', () => {
      lifecycleManager.recordActivity();
      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);
      expect(lifecycleManager.shouldDisconnect()).toBe(true);

      lifecycleManager.reset();
      expect(lifecycleManager.shouldDisconnect()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear inactivity timeout', () => {
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1);

      lifecycleManager.reset();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should reset last activity time', () => {
      lifecycleManager.recordActivity();
      expect(lifecycleManager.getTimeSinceLastActivity()).not.toBeNull();

      lifecycleManager.reset();
      expect(lifecycleManager.getTimeSinceLastActivity()).toBeNull();
    });

    it('should handle reset when no timeout is set', () => {
      expect(() => lifecycleManager.reset()).not.toThrow();
      expect(lifecycleManager.getTimeSinceLastActivity()).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should call reset', () => {
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1);

      lifecycleManager.cleanup();
      expect(jest.getTimerCount()).toBe(0);
      expect(lifecycleManager.getTimeSinceLastActivity()).toBeNull();
    });

    it('should clear all timers and reset state', () => {
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1);
      expect(lifecycleManager.getTimeSinceLastActivity()).not.toBeNull();

      lifecycleManager.cleanup();

      expect(jest.getTimerCount()).toBe(0);
      expect(lifecycleManager.getTimeSinceLastActivity()).toBeNull();
    });
  });

  describe('getTimeSinceLastActivity', () => {
    it('should return null when no activity has been recorded', () => {
      expect(lifecycleManager.getTimeSinceLastActivity()).toBeNull();
    });

    it('should return time since last activity', () => {
      lifecycleManager.recordActivity();

      jest.advanceTimersByTime(5000);

      const timeSince = lifecycleManager.getTimeSinceLastActivity();
      expect(timeSince).toBe(5000);
    });

    it('should return updated time after advancing timers', () => {
      lifecycleManager.recordActivity();

      jest.advanceTimersByTime(1000);
      expect(lifecycleManager.getTimeSinceLastActivity()).toBe(1000);

      jest.advanceTimersByTime(2000);
      expect(lifecycleManager.getTimeSinceLastActivity()).toBe(3000);
    });

    it('should return null after reset', () => {
      lifecycleManager.recordActivity();
      expect(lifecycleManager.getTimeSinceLastActivity()).not.toBeNull();

      lifecycleManager.reset();
      expect(lifecycleManager.getTimeSinceLastActivity()).toBeNull();
    });
  });

  describe('automatic disconnection', () => {
    it('should automatically disconnect after inactivity timeout', async () => {
      lifecycleManager.recordActivity();

      // Advance time by the timeout period
      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);

      // Wait for async operations to complete
      await jest.runAllTimersAsync();

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        `Disconnecting MCP connection due to inactivity (timeout: ${DEFAULT_INACTIVITY_TIMEOUT_MS}ms)`
      );
    });

    it('should not disconnect if activity was recorded before timeout', () => {
      lifecycleManager.recordActivity();

      // Advance time by almost the full timeout (just before it would fire)
      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS - 1000);

      // Verify we haven't disconnected yet
      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();

      // Record activity again (resets the timeout, preventing the first timeout from firing)
      lifecycleManager.recordActivity();

      // Advance time by less than the timeout (should not trigger disconnect)
      // The timeout was reset, so we're still before the new timeout
      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS - 2000);

      // Should not have disconnected because activity was recorded and timeout was reset
      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });

    it('should not disconnect if client is not connected when timeout fires', async () => {
      lifecycleManager.recordActivity();

      // Client disconnects before timeout
      mockMcpClient.isConnected.mockReturnValue(false);

      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);
      await jest.runAllTimersAsync();

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });

    it('should not disconnect if shouldDisconnect returns false when timeout fires', async () => {
      lifecycleManager.recordActivity();

      // Reset activity time before timeout fires
      lifecycleManager.reset();

      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);
      await jest.runAllTimersAsync();

      expect(mockMcpClient.disconnect).not.toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      const disconnectError = new Error('Disconnect failed');
      mockMcpClient.disconnect.mockRejectedValueOnce(disconnectError);

      lifecycleManager.recordActivity();

      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);
      await jest.runAllTimersAsync();

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error during automatic disconnection due to inactivity')
      );
    });

    it('should reset lastActivityTime after successful disconnect', async () => {
      lifecycleManager.recordActivity();
      expect(lifecycleManager.getTimeSinceLastActivity()).not.toBeNull();

      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);
      await jest.runAllTimersAsync();

      expect(lifecycleManager.getTimeSinceLastActivity()).toBeNull();
    });

    it('should not reset lastActivityTime after failed disconnect', async () => {
      const disconnectError = new Error('Disconnect failed');
      mockMcpClient.disconnect.mockRejectedValueOnce(disconnectError);

      lifecycleManager.recordActivity();
      lifecycleManager.getTimeSinceLastActivity();

      jest.advanceTimersByTime(DEFAULT_INACTIVITY_TIMEOUT_MS);
      await jest.runAllTimersAsync();

      // Time should still be tracked (not reset) after failed disconnect
      expect(lifecycleManager.getTimeSinceLastActivity()).not.toBeNull();
    });
  });

  describe('timeout scheduling behavior', () => {
    it('should schedule timeout only when client is connected', () => {
      mockMcpClient.isConnected.mockReturnValue(false);

      lifecycleManager.recordActivity();

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should schedule timeout when client becomes connected', () => {
      mockMcpClient.isConnected.mockReturnValue(false);
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(0);

      mockMcpClient.isConnected.mockReturnValue(true);
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1);
    });

    it('should clear timeout when reset is called', () => {
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1);

      lifecycleManager.reset();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should handle multiple activity recordings correctly', () => {
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1);

      jest.advanceTimersByTime(1000);
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1); // Should still be 1, not 2

      jest.advanceTimersByTime(2000);
      lifecycleManager.recordActivity();
      expect(jest.getTimerCount()).toBe(1); // Should still be 1
    });
  });

  describe('custom timeout', () => {
    it('should use custom timeout when provided', async () => {
      const customTimeout = 5000;
      const manager = new McpConnectionLifecycleManager(mockMcpClient, logger, customTimeout);

      manager.recordActivity();

      jest.advanceTimersByTime(customTimeout);
      await jest.runAllTimersAsync();

      expect(mockMcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        `Disconnecting MCP connection due to inactivity (timeout: ${customTimeout}ms)`
      );
    });

    it('should check shouldDisconnect with custom timeout', () => {
      const customTimeout = 3000;
      const manager = new McpConnectionLifecycleManager(mockMcpClient, logger, customTimeout);

      manager.recordActivity();

      jest.advanceTimersByTime(customTimeout - 1000);
      expect(manager.shouldDisconnect()).toBe(false);

      jest.advanceTimersByTime(1000);
      expect(manager.shouldDisconnect()).toBe(true);
    });
  });
});

