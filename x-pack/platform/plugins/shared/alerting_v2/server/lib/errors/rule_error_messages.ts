/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type RuleValidationContext = 'create' | 'update' | 'upsert';

export const getRuleNotFoundMessage = (id: string): string => `Rule with id "${id}" not found`;

export const getRuleAlreadyExistsMessage = (id: string): string =>
  `Rule with id "${id}" already exists`;

export const getRuleVersionConflictMessage = (id: string): string =>
  `Rule with id "${id}" has already been updated by another user`;

export const getInvalidRuleDataMessage = (context: RuleValidationContext, error: string): string =>
  `Error validating ${context} rule data - ${error}`;
