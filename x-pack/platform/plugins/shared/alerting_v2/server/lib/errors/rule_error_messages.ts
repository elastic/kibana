/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Canonical human-readable messages for rule domain errors.
 * Used by the rules client (runtime Boom errors) and OAS examples so
 * documentation stays aligned with the HTTP responses clients actually see.
 *
 * `message` is not part of the API contract — clients should branch on `code`.
 */

export type RuleValidationContext = 'create' | 'update' | 'upsert';

export const getRuleNotFoundMessage = (id: string): string => `Rule with id "${id}" not found`;

export const getRuleAlreadyExistsMessage = (id: string): string =>
  `Rule with id "${id}" already exists`;

export const getRuleVersionConflictMessage = (id: string): string =>
  `Rule with id "${id}" has already been updated by another user`;

export const getInvalidRuleDataMessage = (
  context: RuleValidationContext,
  zodError: string
): string => `Error validating ${context} rule data - ${zodError}`;
