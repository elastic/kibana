/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExternalSourceValidationContext = 'create' | 'update';

export const getExternalSourceNotFoundMessage = (id: string): string =>
  `External source with ID "${id}" not found`;

export const getExternalSourceAlreadyExistsMessage = (id: string): string =>
  `External source with ID "${id}" already exists`;

export const getExternalSourceVersionConflictMessage = (id: string): string =>
  `External source with ID "${id}" has already been updated by another user`;

export const getInvalidExternalSourceDataMessage = (
  context: ExternalSourceValidationContext,
  zodError: string
): string => `Error validating ${context} external source data - ${zodError}`;
