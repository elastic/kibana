/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const OSQUERY_VERSION_REGEX = /^\d+(\.\d+){0,2}$/;

export const isValidOsqueryVersion = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  return OSQUERY_VERSION_REGEX.test(trimmed);
};
