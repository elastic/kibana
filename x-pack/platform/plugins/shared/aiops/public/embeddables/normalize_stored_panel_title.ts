/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Blank titles hide the panel header and block the default title. */
export const normalizeStoredPanelTitle = (title?: string): string | undefined => {
  const trimmed = title?.trim();
  return trimmed ? trimmed : undefined;
};
