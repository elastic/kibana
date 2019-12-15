/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthenticatedUser } from './common/model';

/**
 * Public interface of the security plugin.
 */
export interface SecurityPlugin {
  getUser: (request: Legacy.Request) => Promise<AuthenticatedUser>;
}
