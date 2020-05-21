/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../../src/core/server';
import { ReportingSetupDeps } from '../types';

export function getUserFactory(security: ReportingSetupDeps['security']) {
  return (request: KibanaRequest) => {
    return security?.authc.getCurrentUser(request) ?? null;
  };
}
