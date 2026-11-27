/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Actions } from '@kbn/security-authorization-core';

import { MANAGE_ACCESS_CONTROL_ACTION } from '../../saved_objects/access_control_service';

/**
 * Privilege operation that grants recovery authority over objects of a type in a space. No feature
 * privilege includes it: only wildcard application privileges, such as those of `superuser`, do.
 *
 * It is the same operation that the Saved Objects access control uses as its admin override. A type
 * uses either that access control or OLS, never both, so a role that holds the override keeps it
 * when the type moves to OLS.
 */
export const RECOVERY_OPERATION = MANAGE_ACCESS_CONTROL_ACTION;

export const getRecoveryAction = (actions: Pick<Actions, 'savedObject'>, type: string) =>
  actions.savedObject.get(type, RECOVERY_OPERATION);

/**
 * Returns the prefix that every Saved Objects privilege action of a type starts with.
 */
export const getSavedObjectActionPrefix = (actions: Pick<Actions, 'savedObject'>, type: string) =>
  getRecoveryAction(actions, type).slice(0, -RECOVERY_OPERATION.length);
