/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ActionPolicyValidationContext = 'create' | 'update' | 'upsert';

export const getActionPolicyNotFoundMessage = (id: string): string =>
  `Action policy with id "${id}" not found`;

export const getActionPolicyAlreadyExistsMessage = (id: string): string =>
  `Action policy with id "${id}" already exists`;

export const getActionPolicyVersionConflictMessage = (id: string): string =>
  `Action policy with id "${id}" has already been updated by another user`;

export const getInvalidActionPolicyDataMessage = (
  context: ActionPolicyValidationContext,
  zodError: string
): string => `Error validating ${context} action policy data - ${zodError}`;
