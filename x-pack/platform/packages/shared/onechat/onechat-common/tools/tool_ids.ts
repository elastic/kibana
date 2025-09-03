/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toolIdRegexp =
  /^(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/;

const reservedKeywords = ['new'];

/**
 * Check if the given ID is a reserved ID
 * Atm this only checks for `new` because that's a value we're using for url paths on the UI.
 */
export const isReservedToolId = (id: string) => {
  return reservedKeywords.includes(id);
};
