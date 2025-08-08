/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtInToolIdPrefix } from './constants';

export const idRegexp = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

/**
 * Check if the given ID is a built-in ID (starting with `.`)
 */
export const isBuiltInToolId = (id: string) => {
  return id.startsWith(builtInToolIdPrefix);
};

/**
 * Check if the given ID is a reserved ID
 * Atm this only checks for built-in IDs, but it will check for MCP and such later.
 */
export const isReservedToolId = (id: string) => {
  return isBuiltInToolId(id);
};
