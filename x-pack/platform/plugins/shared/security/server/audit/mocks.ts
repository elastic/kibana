/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/security-plugin-types-server';

import type { AuditService } from './audit_service';

export const auditLoggerMock = {
  create() {
    return {
      log: jest.fn(),
      enabled: true,
      includeSavedObjectNames: false,
    } as jest.Mocked<AuditLogger>;
  },
};

export const auditServiceMock = {
  create() {
    return {
      getLogger: jest.fn(),
      asScoped: jest.fn().mockReturnValue(auditLoggerMock.create()),
      withoutRequest: auditLoggerMock.create(),
    } as jest.Mocked<ReturnType<AuditService['setup']>>;
  },
};
