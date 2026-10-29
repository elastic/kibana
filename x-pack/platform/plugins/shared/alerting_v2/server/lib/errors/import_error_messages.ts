/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getImportNotFoundMessage = (id: string): string => `Import with ID "${id}" not found`;

export const getImportVersionConflictMessage = (id: string): string =>
  `Import with ID "${id}" has already been updated by another user`;
