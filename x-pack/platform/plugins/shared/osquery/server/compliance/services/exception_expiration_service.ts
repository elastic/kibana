/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export const EXCEPTION_EXPIRATION_TASK_TYPE = 'osquery:compliance_exception_expiration';

/**
 * Service for managing time-bound exception expiration
 * Automatically expires exceptions when their end_date is reached
 */
export class ExceptionExpirationService {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly taskManager: TaskManagerStartContract | undefined,
    private readonly logger: Logger
  ) {}

  /**
   * Find and expire all exceptions past their end_date
   */
  async expireExceptions(): Promise<{
    expired_count: number;
    exceptions: Array<{ id: string; name: string; reason: string }>;
  }> {
    this.logger.debug('Checking for expired exceptions');

    const now = new Date().toISOString();

    // Find all temporary exceptions past their end date
    const { saved_objects } = await this.soClient.find({
      type: 'osquery-compliance-exception',
      filter: `osquery-compliance-exception.attributes.time_scope.type:"temporary" AND osquery-compliance-exception.attributes.time_scope.end_date < "${now}" AND osquery-compliance-exception.attributes.status:"active"`,
      perPage: 1000,
    });

    const expiredExceptions: Array<{ id: string; name: string; reason: string }> = [];

    for (const so of saved_objects) {
      const attrs = so.attributes as any;

      try {
        // Mark exception as expired
        await this.soClient.update('osquery-compliance-exception', so.id, {
          status: 'expired',
          expired_at: now,
          enabled: false,
        });

        // Add audit trail entry
        const currentTrail = attrs.audit_trail || [];

        await this.soClient.update('osquery-compliance-exception', so.id, {
          audit_trail: [
            ...currentTrail,
            {
              action: 'expired',
              user: 'system',
              timestamp: now,
              details: 'Exception reached end_date and was automatically expired',
            },
          ],
        });

        expiredExceptions.push({
          id: so.id,
          name: attrs.name,
          reason: `Expired on ${attrs.time_scope.end_date}`,
        });

        this.logger.info(`Expired exception ${so.id} (${attrs.name})`);
      } catch (error) {
        this.logger.error(`Failed to expire exception ${so.id}: ${error.message}`);
      }
    }

    if (expiredExceptions.length > 0) {
      this.logger.info(`Expired ${expiredExceptions.length} exceptions`);

      // Send notification (optional)
      await this.notifyExpiredExceptions(expiredExceptions);
    }

    return {
      expired_count: expiredExceptions.length,
      exceptions: expiredExceptions,
    };
  }

  /**
   * Check expiration status for specific exception
   */
  async checkExpirationStatus(exceptionId: string): Promise<{
    expired: boolean;
    expires_in_days: number | null;
    end_date: string | null;
  }> {
    const exception = await this.soClient.get('osquery-compliance-exception', exceptionId);

    const attrs = exception.attributes as any;

    if (attrs.time_scope?.type !== 'temporary' || !attrs.time_scope?.end_date) {
      return {
        expired: false,
        expires_in_days: null,
        end_date: null,
      };
    }

    const endDate = new Date(attrs.time_scope.end_date);
    const now = new Date();

    const expired = endDate < now;
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return {
      expired,
      expires_in_days: expired ? 0 : daysRemaining,
      end_date: attrs.time_scope.end_date,
    };
  }

  /**
   * Get exceptions expiring soon (within N days)
   */
  async getExpiringSoon(daysThreshold: number = 7): Promise<
    Array<{
      id: string;
      name: string;
      expires_in_days: number;
      end_date: string;
      scope: any;
    }>
  > {
    const futureDate = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { saved_objects } = await this.soClient.find({
      type: 'osquery-compliance-exception',
      filter: `osquery-compliance-exception.attributes.time_scope.type:"temporary" AND osquery-compliance-exception.attributes.time_scope.end_date > "${now}" AND osquery-compliance-exception.attributes.time_scope.end_date < "${futureDate}" AND osquery-compliance-exception.attributes.status:"active"`,
      perPage: 1000,
    });

    return saved_objects.map((so) => {
      const attrs = so.attributes as any;
      const endDate = new Date(attrs.time_scope.end_date);
      const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      return {
        id: so.id,
        name: attrs.name,
        expires_in_days: daysRemaining,
        end_date: attrs.time_scope.end_date,
        scope: attrs.scope,
      };
    });
  }

  /**
   * Extend exception expiration date
   */
  async extendExpiration(
    exceptionId: string,
    newEndDate: string,
    extendedBy: string,
    reason: string
  ): Promise<void> {
    this.logger.info(`Extending expiration for exception ${exceptionId} to ${newEndDate}`);

    const exception = await this.soClient.get('osquery-compliance-exception', exceptionId);

    const attrs = exception.attributes as any;

    // Validate new end date is in future
    if (new Date(newEndDate) <= new Date()) {
      throw new Error('New end date must be in the future');
    }

    // Update exception
    await this.soClient.update('osquery-compliance-exception', exceptionId, {
      time_scope: {
        ...attrs.time_scope,
        end_date: newEndDate,
        extended_at: new Date().toISOString(),
        extended_by: extendedBy,
      },
    });

    // Add audit entry
    await this.addAuditEntry(exceptionId, {
      action: 'extended',
      user: extendedBy,
      timestamp: new Date().toISOString(),
      details: `Expiration extended to ${newEndDate}. Reason: ${reason}`,
    });
  }

  /**
   * Register expiration check task
   */
  async registerExpirationTask() {
    if (!this.taskManager) {
      this.logger.warn('Task Manager not available - expiration task not registered');
      return;
    }

    await this.taskManager.ensureScheduled({
      id: EXCEPTION_EXPIRATION_TASK_TYPE,
      taskType: EXCEPTION_EXPIRATION_TASK_TYPE,
      schedule: {
        interval: '1h', // Check every hour
      },
      state: {},
      params: {},
    });

    this.logger.info('Exception expiration task registered (runs every hour)');
  }

  /**
   * Add audit trail entry
   */
  private async addAuditEntry(exceptionId: string, entry: any): Promise<void> {
    const exception = await this.soClient.get('osquery-compliance-exception', exceptionId);

    const currentTrail = (exception.attributes as any).audit_trail || [];

    await this.soClient.update('osquery-compliance-exception', exceptionId, {
      audit_trail: [...currentTrail, entry],
    });
  }

  /**
   * Notify about expired exceptions
   */
  private async notifyExpiredExceptions(
    exceptions: Array<{ id: string; name: string; reason: string }>
  ): Promise<void> {
    // TODO: Integrate with Kibana actions/connectors
    this.logger.info('Sending expiration notifications', { count: exceptions.length });

    // Placeholder for notification logic
    // Would send email/Slack notification:
    // - Subject: "Compliance Exceptions Expired"
    // - Body: List of expired exceptions with names and reasons
  }
}

/**
 * Task Manager task definition for exception expiration
 */
export function createExpirationTaskDefinition(
  soClient: SavedObjectsClientContract,
  logger: Logger
) {
  return {
    title: 'Compliance Exception Expiration Check',
    timeout: '5m',
    maxAttempts: 3,
    createTaskRunner: () => {
      return {
        async run() {
          const service = new ExceptionExpirationService(soClient, undefined, logger);

          const result = await service.expireExceptions();

          logger.debug('Exception expiration check complete', {
            expired_count: result.expired_count,
          });

          return {
            state: {
              lastRun: new Date().toISOString(),
              lastExpiredCount: result.expired_count,
            },
          };
        },
      };
    },
  };
}
