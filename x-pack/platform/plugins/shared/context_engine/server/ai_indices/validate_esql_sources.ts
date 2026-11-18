/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';
import { validateQuery } from '@kbn/esql-language';
import type { AiIndexDest, AiIndexSource } from '../../common/http_api/ai_indices';
import { previewQuery } from '../ki_verification/verifiers/esql_attribute';
import { formatValidationError } from '../ki_verification/verifiers/esql_valid_syntax';
import { matchesGlob } from '../utils/matches_glob';
import { InvalidEsqlSourceError } from './errors';

const isCircularSource = (query: string, dest: string): boolean => {
  const { root } = Parser.parse(query);
  const targets: string[] = [];
  Walker.walk(root, {
    visitSource: ({ prefix, index, name }) => {
      if (prefix === undefined) {
        targets.push(...(index?.valueUnquoted ?? name).split(','));
      }
    },
  });
  return targets.some((target) => matchesGlob(target.trim(), dest));
};

const validateSingleEsqlSource = async (
  query: string,
  dest: string
): Promise<string | undefined> => {
  if (query.trim() === '') {
    return 'ES|QL source value cannot be empty';
  }

  const { errors } = await validateQuery(query);
  if (errors.length > 0) {
    return `ES|QL source '${previewQuery(query)}' is invalid: ${errors
      .map(formatValidationError)
      .join('; ')}`;
  }

  if (isCircularSource(query, dest)) {
    return `ES|QL source '${previewQuery(query)}' reads from the AI index's own dest '${dest}'`;
  }
};

/** Asserts every ES|QL source is syntactically valid and non-circular, reporting all failures at once. */
export const validateEsqlSources = async (
  sources: AiIndexSource[],
  dest: AiIndexDest
): Promise<void> => {
  const failures: string[] = [];
  for (const source of sources) {
    if (source.type !== 'esql') {
      continue;
    }
    const failure = await validateSingleEsqlSource(source.value, dest.value);
    if (failure) {
      failures.push(failure);
    }
  }

  if (failures.length > 0) {
    throw new InvalidEsqlSourceError(failures.join('\n'));
  }
};
