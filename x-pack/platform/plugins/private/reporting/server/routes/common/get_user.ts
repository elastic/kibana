/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import type { SecurityApiKey } from '@elastic/elasticsearch/lib/api/types';
import type { ReportingUser } from '../../types';

export function getUser(request: KibanaRequest, securityService: SecurityServiceStart) {
  return securityService.authc.getCurrentUser(request) ?? false;
}

export function getUserTriple({
  user,
  apiKey,
}: {
  user: ReportingUser;
  apiKey?: SecurityApiKey | null;
}): string | false {
  if (apiKey) {
    return `${apiKey.username}:${apiKey.realm_type ?? 'unknown_realm_type'}:${apiKey.realm}`;
  }
  if (user) {
    return `${user.username}:${user.authentication_realm.type}:${user.authentication_realm.name}`;
  }
  return false;
}
