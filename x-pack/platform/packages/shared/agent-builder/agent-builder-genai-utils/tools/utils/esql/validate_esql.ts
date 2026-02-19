/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ValidationOptions } from '@kbn/esql-language';

export type ValidateEsqlQueryCallbacks = Parameters<typeof validateQuery>[1];

export const validateEsqlQuery = async (
  query: string,
  callbacks?: ValidateEsqlQueryCallbacks,
  options?: ValidationOptions
): Promise<string | undefined> => {
  const { errors } = await validateQuery(query, callbacks, options);
  if (errors.length === 0) {
    return undefined;
  }
  return errors.map((error) => ('text' in error ? error.text : error.message)).join('\n');
};
