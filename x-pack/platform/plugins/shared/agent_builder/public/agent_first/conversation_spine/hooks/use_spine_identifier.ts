/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** POC display id — last 3 alphanumeric chars of conversation id, zero-padded. */
export const formatSpineIdentifier = (conversationId: string): string => {
  const normalized = conversationId.replace(/-/g, '');
  const suffix = normalized.slice(-3);
  return suffix.padStart(3, '0').toUpperCase();
};
