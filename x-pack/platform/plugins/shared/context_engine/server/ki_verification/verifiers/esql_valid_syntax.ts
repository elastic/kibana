/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import type { ESQLMessage } from '@kbn/esql-language';
import type { EditorError } from '@elastic/esql/types';
import { ESQL_VALID_SYNTAX_VERIFIER_ID } from '../../../common/ki_verification';
import {
  getEsqlQueries,
  getOversizedQueryFailure,
  hasEsqlAttribute,
  previewQuery,
} from './esql_attribute';
import type { KiVerifier } from '../types';

export { ESQL_VALID_SYNTAX_VERIFIER_ID };

const formatValidationError = (error: ESQLMessage | EditorError): string =>
  'text' in error
    ? `${error.text} (at position ${error.location.min}-${error.location.max})`
    : `${error.message} (at line ${error.startLineNumber}:${error.startColumn})`;

/** Statically validates a KI's ES|QL. */
export const createEsqlValidSyntaxVerifier = (): KiVerifier => ({
  id: ESQL_VALID_SYNTAX_VERIFIER_ID,
  applies: hasEsqlAttribute,
  async verify(ki, context) {
    const extracted = getEsqlQueries(ki, context);
    if (!extracted.ok) {
      return { passed: false, reason: extracted.reason };
    }

    const failures: string[] = [...extracted.failures];
    for (const queryRef of extracted.queries) {
      context.abortSignal?.throwIfAborted();

      const oversized = getOversizedQueryFailure(queryRef);
      if (oversized) {
        failures.push(oversized);
        continue;
      }

      const { source, query } = queryRef;
      const { errors } = await validateQuery(query);
      if (errors.length > 0) {
        failures.push(
          `${source}: ES|QL query "${previewQuery(query)}" is invalid: ${errors
            .map(formatValidationError)
            .join('; ')}`
        );
      }
    }

    return failures.length > 0 ? { passed: false, reason: failures.join('\n') } : { passed: true };
  },
});
