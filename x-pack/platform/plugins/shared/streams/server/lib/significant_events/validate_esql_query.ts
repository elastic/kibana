/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { Streams } from '@kbn/streams-schema';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import { StatusError } from '../streams/errors/status_error';

export class EsqlQueryValidationError extends StatusError {
  constructor(message: string) {
    super(message, 400);
  }
}

export async function validateEsqlQueryForStreamOrThrow({
  esqlQuery,
  stream,
}: {
  esqlQuery: string;
  stream: Streams.all.Definition;
}): Promise<void> {
  let root: ESQLAstQueryExpression;

  try {
    ({ root } = Parser.parse(esqlQuery));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new EsqlQueryValidationError(`Invalid ES|QL query: ${message}`);
  }

  const fromCmd = Walker.match(root, { type: 'command', name: 'from' });
  if (!fromCmd) {
    throw new EsqlQueryValidationError('ES|QL query must contain a FROM clause');
  }

  const sources = Walker.matchAll(fromCmd, { type: 'source', sourceType: 'index' }).map(
    (node) => node.name
  );
  const { name } = stream;
  const wiredPattern = [name, `${name}.*`];
  const matchesWiredPattern =
    sources.length === 2 && sources[0] === name && sources[1] === `${name}.*`;

  if (Streams.ClassicStream.Definition.is(stream)) {
    const isNameOnly = sources.length === 1 && sources[0] === name;
    if (!isNameOnly && !matchesWiredPattern) {
      throw new EsqlQueryValidationError(
        `ES|QL query must use FROM ${name} or FROM ${wiredPattern.join(', ')}`
      );
    }
  } else if (!matchesWiredPattern) {
    throw new EsqlQueryValidationError(`ES|QL query must use FROM ${wiredPattern.join(', ')}`);
  }

  const metadataOption = Walker.match(fromCmd, { type: 'option', name: 'metadata' });
  const metadataFields = metadataOption
    ? Walker.matchAll(metadataOption, { type: 'column' }).map((col) => col.name)
    : [];

  if (!metadataFields.includes('_id') || !metadataFields.includes('_source')) {
    throw new EsqlQueryValidationError(
      'ES|QL query METADATA must include both `_id` and `_source`'
    );
  }
}
