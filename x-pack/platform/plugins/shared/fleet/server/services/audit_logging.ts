/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditEvent, AuditLogger } from '@kbn/security-plugin/server';

import { appContextService } from './app_context';
import { getRequestStore } from './request_store';

class AuditLoggingService {
  /**
   * Write a custom audit log record. If a current request is available, the log will include
   * user/session data. If not, an unscoped audit logger will be used.
   *
   * Note: all Fleet audit logs written via this method will have a `labels.application` value
   * of `elastic/fleet`. Consumers aren't able to override this value, and a custom `labels.application`
   * value provided as an argument will be overwritten.
   */
  public writeCustomAuditLog(args: AuditEvent) {
    const securitySetup = appContextService.getSecuritySetup();
    let auditLogger: AuditLogger | undefined;

    const request = getRequestStore().getStore();

    if (request) {
      auditLogger = securitySetup.audit.asScoped(request);
    } else {
      auditLogger = securitySetup.audit.withoutRequest;
    }

    auditLogger.log({ ...args, labels: { ...args.labels, application: 'elastic/fleet' } });
  }

  /**
   * Helper method for writing saved object related audit logs. Since Fleet
   * uses an internal SO client to support its custom RBAC model around Fleet/Integrations
   * permissions, we need to implement our own audit logging for saved objects that use the
   * internal client. This helper reduces the boilerplate around audit logging in those cases.
   *
   * @example
   * ```ts
   * auditLoggingService.writeCustomSoAuditLog({
   *   action: 'find',
   *   id: 'some-id-123',
   *   savedObjectType: PACKAGE_POLICY_SAVED_OBJECT_TYPE
   * });
   * ```
   */
  public writeCustomSoAuditLog({
    action,
    id,
    name,
    savedObjectType,
  }: {
    action: 'find' | 'get' | 'create' | 'update' | 'delete';
    id: string;
    name?: string;
    savedObjectType: string;
  }) {
    this.writeCustomAuditLog({
      message: `User ${
        action === 'find' || action === 'get' ? 'has accessed' : 'is accessing'
      } ${savedObjectType} [id=${id}]`,
      event: {
        action: `saved_object_${action}`,
        category: ['database'],
        outcome: 'unknown',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id,
          name,
          type: savedObjectType,
        },
      },
    });
  }
}

export const auditLoggingService = new AuditLoggingService();
