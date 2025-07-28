/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import { StatusError } from './status_error';

export class InsufficientPermissionsError extends StatusError {
  constructor(message: string, permissions: SecurityHasPrivilegesResponse) {
    super(message, 403);
    this.name = 'InsufficientPermissionsError';
    this.data = {
      permissions,
    };
  }
}
