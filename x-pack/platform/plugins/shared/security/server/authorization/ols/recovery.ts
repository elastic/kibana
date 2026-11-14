/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Actions } from '@kbn/security-authorization-core';

import type { OlsService } from './ols_service';
import type { PrivilegeCheckRecovery } from '../check_privileges';

/**
 * Privilege operation that grants recovery authority over objects of a type in a space. No feature
 * privilege includes it: only wildcard application privileges, such as those of `superuser`, do.
 */
export const RECOVERY_OPERATION = 'manage_access_control';

/**
 * Space ID that a search across all spaces passes. Recovery for it is checked globally.
 */
export const ALL_SPACES_ID = '*';

export const getRecoveryAction = (actions: Pick<Actions, 'savedObject'>, type: string) =>
  actions.savedObject.get(type, RECOVERY_OPERATION);

/**
 * Returns the prefix that every Saved Objects privilege action of a type starts with.
 */
export const getSavedObjectActionPrefix = (actions: Pick<Actions, 'savedObject'>, type: string) =>
  getRecoveryAction(actions, type).slice(0, -RECOVERY_OPERATION.length);

/**
 * Lets every request-scoped privilege check answer recovery for the types with an access policy that
 * it already asks about, in the same Elasticsearch request. Consumers then never ask for recovery
 * themselves, and object-level security (OLS) never needs a second privilege request for it. Before
 * the OLS service starts, and while OLS is disabled, checks are left unchanged.
 */
export const createPrivilegeCheckRecovery = (
  getOlsService: () => OlsService | undefined
): PrivilegeCheckRecovery => ({
  getRecoveryActions: (kibanaPrivileges) =>
    getOlsService()?.getRecoveryActions(kibanaPrivileges) ?? new Map(),
  primeRecovery: (request: KibanaRequest, type, spaceIds, granted) =>
    getOlsService()?.asScoped(request).primeRecovery(type, spaceIds, granted),
});
