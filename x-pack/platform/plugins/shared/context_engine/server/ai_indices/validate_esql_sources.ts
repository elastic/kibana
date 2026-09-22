/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditorError } from '@elastic/esql/types';
import { validateQuery } from '@kbn/esql-language';
import type { ESQLMessage } from '@kbn/esql-language';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import { InvalidEsqlSourceError } from './errors';

const QUERY_PREVIEW_LENGTH = 200;

const previewQuery = (query: string): string =>
  query.length > QUERY_PREVIEW_LENGTH ? `${query.slice(0, QUERY_PREVIEW_LENGTH)}…` : query;

const formatValidationError = (error: ESQLMessage | EditorError): string =>
  'text' in error
    ? `${error.text} (at position ${error.location.min}-${error.location.max})`
    : `${error.message} (at line ${error.startLineNumber}:${error.startColumn})`;

const validateEsqlSource = async (query: string): Promise<void> => {
  if (query.trim() === '') {
    throw new InvalidEsqlSourceError('ES|QL source value cannot be empty');
  }

  const { errors } = await validateQuery(query);
  if (errors.length > 0) {
    throw new InvalidEsqlSourceError(
      `ES|QL source '${previewQuery(query)}' is invalid: ${errors
        .map(formatValidationError)
        .join('; ')}`
    );
  }
};

/** Asserts every ES|QL source is syntactically valid. */
export const validateEsqlSources = async (sources: AiIndexSource[]): Promise<void> => {
  await Promise.all(
    sources
      .filter((source) => source.type === 'esql')
      .map((source) => validateEsqlSource(source.value))
  );
};
