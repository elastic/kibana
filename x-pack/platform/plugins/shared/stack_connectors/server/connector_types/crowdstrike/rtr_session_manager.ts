/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { Logger } from '@kbn/logging';
import { CrowdstrikeInitRTRResponseSchema } from '@kbn/connector-schemas/crowdstrike';
import type {
  CrowdstrikeInitRTRParams,
  RelaxedCrowdstrikeBaseApiResponse,
} from '@kbn/connector-schemas/crowdstrike';

export class CrowdStrikeSessionManager {
  private currentBatchId: string | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private closeSessionTimeout: NodeJS.Timeout | null = null;
  private readonly logger: Logger;

  constructor(
    private readonly urls: { batchInitRTRSession: string; batchRefreshRTRSession: string },
    private readonly apiRequest: <R extends RelaxedCrowdstrikeBaseApiResponse>(
      req: SubActionRequestParams<R>,
      connectorUsageCollector: ConnectorUsageCollector,
      retried?: boolean
    ) => Promise<R>,
    logger: Logger
  ) {
    this.logger = logger.get('crowdStrikeSessionManager');
    this.logger.debug('CrowdStrikeSessionManager initialized');
  }

  async initializeSession(
    payload: CrowdstrikeInitRTRParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<string> {
    if (!this.currentBatchId) {
      this.logger.debug(
        `Initializing new RTR session with ${payload.endpoint_ids.length} endpoints`
      );

      try {
        const response = await this.apiRequest(
          {
            url: this.urls.batchInitRTRSession,
            method: 'post',
            data: {
              host_ids: payload.endpoint_ids,
            },
            responseSchema: CrowdstrikeInitRTRResponseSchema,
          },
          connectorUsageCollector
        );

        if (!response.batch_id || typeof response.batch_id !== 'string') {
          this.logger.error(
            `Invalid batch_id received from CrowdStrike API: ${response.batch_id}.`
          );
          throw new Error('Invalid batch_id received from CrowdStrike API');
        }

        this.currentBatchId = response.batch_id;
        this.logger.debug(
          `RTR session initialized successfully with batch_id: ${this.currentBatchId}`
        );

        this.startRefreshInterval(connectorUsageCollector);
      } catch (error) {
        this.logger.error('Failed to initialize RTR session', {
          error: error.message,
          endpointIds: payload.endpoint_ids,
        });
        this.clearSessionState();
        throw error;
      }
    } else {
      this.logger.debug(`Reusing existing RTR session with batch_id: ${this.currentBatchId}`);
    }

    this.resetCloseSessionTimeout();

    return this.currentBatchId;
  }

  private startRefreshInterval(connectorUsageCollector: ConnectorUsageCollector) {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.logger.debug('Starting RTR session refresh interval');
    this.refreshInterval = setInterval(() => {
      this.refreshSession(connectorUsageCollector).catch((error) => {
        this.logger.error('RTR session refresh failed', {
          error: error.message,
          batch_id: this.currentBatchId,
        });
        this.clearSessionState();
      });
    }, 5 * 60 * 1000); // Refresh every 5 minutes
  }

  private async refreshSession(connectorUsageCollector: ConnectorUsageCollector): Promise<void> {
    if (!this.currentBatchId) {
      this.logger.warn('Attempted to refresh session without valid batch_id');
      return;
    }

    this.logger.debug(`Refreshing RTR session with batch_id: ${this.currentBatchId}`);

    try {
      const response = await this.apiRequest(
        {
          url: this.urls.batchRefreshRTRSession,
          method: 'post',
          data: {
            batch_id: this.currentBatchId,
          },
          responseSchema: CrowdstrikeInitRTRResponseSchema,
        },
        connectorUsageCollector
      );

      if (!response.batch_id || response.batch_id !== this.currentBatchId) {
        this.logger.error(
          `Invalid batch_id in refresh response. Expected: ${this.currentBatchId}, Received: ${response.batch_id}`
        );
        throw new Error('Invalid batch_id in refresh response');
      }

      this.logger.debug(`RTR session refreshed successfully with batch_id: ${this.currentBatchId}`);
    } catch (error) {
      this.logger.error(`Failed to refresh RTR session with batch_id: ${this.currentBatchId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  private resetCloseSessionTimeout() {
    if (this.closeSessionTimeout) {
      clearTimeout(this.closeSessionTimeout);
    }

    this.logger.debug('Resetting session close timeout');
    this.closeSessionTimeout = setTimeout(() => {
      this.logger.debug('Session timeout reached, terminating session');
      this.terminateSession().catch((error) => {
        this.logger.error('Failed to terminate session on timeout', {
          error: error.message,
        });
      });
    }, 10 * 60 * 1000); // Close session after 10 minutes of inactivity
  }

  private async terminateSession(): Promise<void> {
    this.logger.debug(`Terminating RTR session with batch_id: ${this.currentBatchId}`);

    this.clearSessionState();
  }

  /**
   * Clears all session state and intervals/timeouts
   */
  private clearSessionState(): void {
    const previousBatchId = this.currentBatchId;

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.closeSessionTimeout) {
      clearTimeout(this.closeSessionTimeout);
      this.closeSessionTimeout = null;
    }

    this.currentBatchId = null;

    if (previousBatchId) {
      this.logger.debug(`Session state cleared for batch_id: ${previousBatchId}`);
    }
  }
}
