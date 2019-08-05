/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IAuditLog } from '../../../../plugins/audit_log/server/types';

export function getMockAuditLog(): IAuditLog {
  return {
    log: jest.fn(),
    search: jest.fn(),
  };
}
