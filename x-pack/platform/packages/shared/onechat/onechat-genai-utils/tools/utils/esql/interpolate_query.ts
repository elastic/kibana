/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interpolates parameters into a templated ESQL query string.
 *
 * @param template The ESQL query template with '?' placeholders (e.g., "?user_id").
 * @param params An object where keys match the placeholder names and values are the data to insert.
 * @returns The interpolated ESQL query string.
 *
 * **Important** This is meant as a workaround until a proper util gets exposed from `@kbn/esql-ast`,
 *               and likely doesn't cover all edge cases.
 */
export const interpolateEsqlQuery = (template: string, params: Record<string, unknown>): string => {
  let interpolatedQuery = template;

  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key];
      const placeholder = new RegExp(`\\?${key}\\b`, 'g');

      // Format the value based on its type
      const formattedValue = typeof value === 'string' ? `"${value}"` : String(value);

      // Replace all occurrences of the placeholder
      interpolatedQuery = interpolatedQuery.replace(placeholder, formattedValue);
    }
  }

  return interpolatedQuery;
};
