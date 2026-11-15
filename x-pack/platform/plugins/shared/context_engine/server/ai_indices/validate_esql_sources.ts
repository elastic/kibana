/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { AiIndexSource } from '../../common/http_api/ai_indices';
import { previewQuery } from '../ki_verification/verifiers/esql_attribute';
import { formatValidationError } from '../ki_verification/verifiers/esql_valid_syntax';
import { InvalidEsqlSourceError } from './errors';

const validateSingleEsqlSource = async (query: string): Promise<string | undefined> => {
  if (query.trim() === '') {
    return 'ES|QL source value cannot be empty';
  }

  const { errors } = await validateQuery(query);
  if (errors.length > 0) {
    return `ES|QL source '${previewQuery(query)}' is invalid: ${errors
      .map(formatValidationError)
      .join('; ')}`;
  }
};

/** Asserts every ES|QL source is syntactically valid, reporting all failures at once. */
export const validateEsqlSources = async (sources: AiIndexSource[]): Promise<void> => {
  const failures: string[] = [];
  for (const source of sources) {
    if (source.type !== 'esql') {
      continue;
    }
    const failure = await validateSingleEsqlSource(source.value);
    if (failure) {
      failures.push(failure);
    }
  }

  if (failures.length > 0) {
    throw new InvalidEsqlSourceError(failures.join('\n'));
  }
};
