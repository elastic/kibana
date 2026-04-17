/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extracts the LLM-provided description from tool params, falling back to a
 * fenced JSON block of the remaining params when the description is absent.
 */
export const getConfirmationMessage = (
  toolParams: Record<string, unknown>,
  descriptionKey: string
): string => {
  const { [descriptionKey]: description, ...rest } = toolParams;
  if (typeof description === 'string' && description.length > 0) {
    return description;
  }
  return '```json\n' + JSON.stringify(rest, null, 2) + '\n```';
};
