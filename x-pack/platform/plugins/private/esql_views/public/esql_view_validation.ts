/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLMessage } from '@kbn/esql-language';
import type { EditorError } from '@elastic/esql/types';

export const MAX_ESQL_VIEW_QUERY_LENGTH = 100_000;

const getValidationMessage = (error: ESQLMessage | EditorError): string =>
  'text' in error ? error.text : error.message;

export const getEsqlViewQuerySyntaxError = async (query: string): Promise<string | undefined> => {
  const { validateQuery } = await import('@kbn/esql-language');
  const { errors } = await validateQuery(query);
  return errors.length > 0 ? getValidationMessage(errors[0]) : undefined;
};
