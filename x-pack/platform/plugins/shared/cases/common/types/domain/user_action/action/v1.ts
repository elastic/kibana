/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * These values are used in a number of places including to define the accepted values in the
 * user_actions/_find api. These values should not be removed only new values can be added.
 */
export const UserActionTypes = {
  assignees: 'assignees',
  comment: 'comment',
  connector: 'connector',
  description: 'description',
  pushed: 'pushed',
  tags: 'tags',
  title: 'title',
  status: 'status',
  settings: 'settings',
  severity: 'severity',
  create_case: 'create_case',
  delete_case: 'delete_case',
  category: 'category',
  customFields: 'customFields',
  observables: 'observables',
  // Key intentionally uses snake_case to match the saved object attribute name returned by
  // Object.keys(updatedAttributes), which is used in getUserActionItemByDifference.
  extended_fields: 'extended_fields',
  template: 'template',
} as const;

type UserActionActionTypeKeys = keyof typeof UserActionTypes;
/**
 * This defines the type of the user action, meaning what individual action was taken, for example changing the status,
 * adding an assignee etc.
 */
export type UserActionType = (typeof UserActionTypes)[UserActionActionTypeKeys];

export const UserActionActions = {
  add: 'add',
  create: 'create',
  delete: 'delete',
  update: 'update',
  push_to_service: 'push_to_service',
} as const;

/**
 * This defines the high level category for the user action. Whether the user add, removed, updated something
 */
export type UserActionAction = (typeof UserActionActions)[keyof typeof UserActionActions];

export const UserActionActionsSchema = z.enum(
  Object.values(UserActionActions) as [UserActionAction, ...UserActionAction[]]
);
