/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/types';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

const REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE = ['reserved', 'native'];

export function isUserAnonymous(user: Pick<AuthenticatedUser, 'authentication_provider'>) {
  return user.authentication_provider.type === 'anonymous';
}

/**
 * All users are supposed to have profiles except anonymous users and users authenticated
 * via authentication HTTP proxies.
 * @param user Authenticated user information.
 */
export function canUserHaveProfile(user: AuthenticatedUser) {
  return !isUserAnonymous(user) && user.authentication_provider.type !== 'http';
}

export function canUserChangePassword(
  user: Pick<AuthenticatedUser, 'authentication_realm' | 'authentication_provider'>
) {
  return (
    REALMS_ELIGIBLE_FOR_PASSWORD_CHANGE.includes(user.authentication_realm.type) &&
    !isUserAnonymous(user)
  );
}

export function canUserChangeDetails(
  user: Pick<AuthenticatedUser, 'authentication_realm'>,
  capabilities: Capabilities
) {
  return user.authentication_realm.type === 'native' && capabilities.management.security.users;
}
