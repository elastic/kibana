/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical human-readable messages for action-policy domain errors.
 * Used by the action policy client (runtime Boom errors) and OAS examples so
 * documentation stays aligned with the HTTP responses clients actually see.
 *
 * `message` is not part of the API contract — clients should branch on `code`.
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
