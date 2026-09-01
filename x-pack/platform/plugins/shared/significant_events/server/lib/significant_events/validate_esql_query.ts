/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { Streams } from '@kbn/streams-schema';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import { StatusError } from '../errors/status_error';

export class EsqlQueryValidationError extends StatusError {
  constructor(message: string, data?: unknown) {
    super(message, 400);
    this.data = data;
  }
}

export function validateEsqlQueryForStreamOrThrow({
  esqlQuery,
  stream,
}: {
  esqlQuery: string;
  stream: Streams.all.Definition;
}): void {
  let root: ESQLAstQueryExpression;
  let parseErrors: ReturnType<typeof Parser.parse>['errors'];

  try {
    ({ root, errors: parseErrors } = Parser.parse(esqlQuery));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new EsqlQueryValidationError(`Invalid ES|QL query: ${message}`);
  }

  // `Parser.parse` reports syntax errors in `errors` (it does not throw). Fail
  // closed: an unparseable query would install a rule that breaks on execution.
  if (parseErrors.length > 0) {
    throw new EsqlQueryValidationError(
      `Invalid ES|QL query: ${parseErrors.map((error) => error.message).join('; ')}`
    );
  }

  const fromCmd = Walker.match(root, { type: 'command', name: 'from' });
  if (!fromCmd) {
    throw new EsqlQueryValidationError('ES|QL query must contain a FROM clause');
  }

  const sourcesPattern = Walker.matchAll(fromCmd, { type: 'source', sourceType: 'index' })
    .map((node) => node.name)
    .join(', ');
  const { name } = stream;
  const wiredPattern = [name, `${name}.*`].join(', ');
  const matchesWiredPattern = sourcesPattern === wiredPattern;

  if (Streams.ClassicStream.Definition.is(stream)) {
    const isNameOnly = sourcesPattern === name;
    if (!isNameOnly && !matchesWiredPattern) {
      throw new EsqlQueryValidationError(
        `ES|QL query must use FROM ${name} or FROM ${wiredPattern}`
      );
    }
  } else if (Streams.QueryStream.Definition.is(stream)) {
    const viewName = stream.query.view;
    if (sourcesPattern !== viewName) {
      throw new EsqlQueryValidationError(`ES|QL query must use FROM ${viewName}`);
    }
  } else if (!matchesWiredPattern) {
    throw new EsqlQueryValidationError(`ES|QL query must use FROM ${wiredPattern}`);
  }
}
