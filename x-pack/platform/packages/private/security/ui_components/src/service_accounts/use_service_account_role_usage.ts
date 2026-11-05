/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { IHttpFetchError } from '@kbn/core/public';
import type { CoreServiceAccountsService } from '@kbn/core-security-browser';
import type { ServiceAccountRoleReference } from '@kbn/core-security-common';

/**
 * What is known about the service accounts that hold a set of roles.
 *
 * `hidden` means there is nothing to say: service accounts are unavailable, the user may not look
 * them up, or there were no roles to look up. `error` means the lookup failed for another reason.
 */
export type ServiceAccountRoleUsage =
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; serviceAccounts: ServiceAccountRoleReference[]; complete: boolean };

export type ServiceAccountRoleUsageLookup = Pick<
  CoreServiceAccountsService,
  'isEnabled' | 'findByRoles'
>;

// A 404 is how the route answers when the feature is off on the server, and a 403 is a user who
// doesn't hold `manage_security`. Neither is something the user can act on here.
const HIDDEN_STATUSES = new Set([403, 404]);

const HIDDEN: ServiceAccountRoleUsage = { status: 'hidden' };

const toUniqueRoles = (roles: readonly string[]): string[] => Array.from(new Set(roles)).sort();

/**
 * Looks up the service accounts that hold any of `roles`. Never rejects: a failure is reported as
 * an `error` or `hidden` usage.
 */
export const findServiceAccountRoleUsage = async (
  serviceAccounts: ServiceAccountRoleUsageLookup,
  roles: readonly string[]
): Promise<Exclude<ServiceAccountRoleUsage, { status: 'loading' }>> => {
  const uniqueRoles = toUniqueRoles(roles);
  if (!serviceAccounts.isEnabled() || uniqueRoles.length === 0) {
    return { status: 'hidden' };
  }

  try {
    const { serviceAccounts: found, complete } = await serviceAccounts.findByRoles(uniqueRoles);
    return { status: 'loaded', serviceAccounts: found, complete };
  } catch (error) {
    const status = (error as IHttpFetchError).response?.status;
    return status !== undefined && HIDDEN_STATUSES.has(status)
      ? { status: 'hidden' }
      : { status: 'error' };
  }
};

/**
 * Tracks the service accounts that hold any of `roles`, looking them up again whenever the set of
 * roles changes. The set is compared by value, so callers may pass a new array on every render.
 * A response that arrives after the roles changed again is dropped.
 *
 * @param options.debounceMs How long the roles must stay the same before they are looked up, for
 * callers whose roles change as the user types or picks.
 */
export const useServiceAccountRoleUsage = (
  serviceAccounts: ServiceAccountRoleUsageLookup,
  roles: readonly string[],
  { debounceMs = 0 }: { debounceMs?: number } = {}
): ServiceAccountRoleUsage => {
  const rolesKey = JSON.stringify(toUniqueRoles(roles));
  const [usage, setUsage] = useState<ServiceAccountRoleUsage>(HIDDEN);

  useEffect(() => {
    const uniqueRoles: string[] = JSON.parse(rolesKey);
    if (!serviceAccounts.isEnabled() || uniqueRoles.length === 0) {
      // Kept as is when already hidden, so a page that never looks anything up never re-renders.
      setUsage((current) => (current.status === 'hidden' ? current : HIDDEN));
      return;
    }

    let isCurrent = true;
    setUsage({ status: 'loading' });
    const timer = setTimeout(() => {
      findServiceAccountRoleUsage(serviceAccounts, uniqueRoles).then((result) => {
        if (isCurrent) setUsage(result);
      });
    }, debounceMs);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [serviceAccounts, rolesKey, debounceMs]);

  return usage;
};
