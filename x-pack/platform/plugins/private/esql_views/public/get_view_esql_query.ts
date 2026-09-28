/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldBeQuotedSource } from '@kbn/esql-language';
import { escapeStringValue } from '@kbn/esql-utils';

/** Builds a `FROM` query for a view, quoting the name when the ES|QL lexer cannot read it unquoted. */
export const getViewEsqlQuery = (viewName: string): string => {
  const source = shouldBeQuotedSource(viewName) ? escapeStringValue(viewName) : viewName;

  return `FROM ${source}`;
};
