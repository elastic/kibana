/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ImportConfigValidationContext = 'create' | 'update';

export const getImportConfigNotFoundMessage = (id: string): string =>
  `Import config with ID "${id}" not found`;

export const getImportConfigAlreadyExistsMessage = (id: string): string =>
  `Import config with ID "${id}" already exists`;

export const getImportConfigVersionConflictMessage = (id: string): string =>
  `Import config with ID "${id}" has already been updated by another user`;

export const getInvalidImportConfigDataMessage = (
  context: ImportConfigValidationContext,
  zodError: string
): string => `Error validating ${context} import config data - ${zodError}`;
