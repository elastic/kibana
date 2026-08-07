/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { validateQuery } from '@kbn/esql-language';
import type {
  KiVerifier,
  KiVerifierContext,
  KiVerifierResult,
  KnowledgeItemCandidate,
} from '../types';

const ESQL_FENCED_BLOCK_REGEX = /```esql\s*\n([\s\S]*?)```/gi;

const extractQueries = (ki: KnowledgeItemCandidate): string[] => {
  const queries: string[] = [];

  const attributeQuery = ki.attributes?.esql;
  if (typeof attributeQuery === 'string' && attributeQuery.trim().length > 0) {
    queries.push(attributeQuery.trim());
  }

  if (ki.content) {
    for (const match of ki.content.matchAll(ESQL_FENCED_BLOCK_REGEX)) {
      const query = match[1].trim();
      if (query.length > 0) {
        queries.push(query);
      }
    }
  }

  return queries;
};

interface QueryCheck {
  outcome: 'valid' | 'invalid' | 'error';
  messages: string[];
}

const checkQuery = async (query: string, context: KiVerifierContext): Promise<QueryCheck> => {
  const { errors: validationErrors } = await validateQuery(query);
  if (validationErrors.length > 0) {
    return {
      outcome: 'invalid',
      messages: validationErrors.map((error) => ('text' in error ? error.text : error.message)),
    };
  }

  try {
    await context.esClient.esql.query(
      { query: `${query}\n| LIMIT 0` },
      { signal: context.abortSignal, requestTimeout: '10s' }
    );
    return { outcome: 'valid', messages: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A 400 means Elasticsearch rejected the query itself (parsing or
    // verification, e.g. an unknown index or column), so the KI is invalid.
    // Anything else (auth, timeouts, availability) means the check could not
    // be completed and is no judgment on the KI.
    if (error instanceof errors.ResponseError && error.statusCode === 400) {
      return { outcome: 'invalid', messages: [message] };
    }
    return { outcome: 'error', messages: [message] };
  }
};

export const createEsqlVerifier = (): KiVerifier => ({
  id: 'esql',
  async verify(ki, context): Promise<KiVerifierResult> {
    const queries = extractQueries(ki);

    if (queries.length === 0) {
      return {
        verifier: 'esql',
        status: 'skipped',
        messages: ['No ES|QL queries found in knowledge item'],
      };
    }

    const failures: string[] = [];
    const checkErrors: string[] = [];
    for (const query of queries) {
      const { outcome, messages } = await checkQuery(query, context);
      if (outcome === 'invalid') {
        failures.push(`Invalid ES|QL query "${query}": ${messages.join('; ')}`);
      } else if (outcome === 'error') {
        checkErrors.push(`Could not verify ES|QL query "${query}": ${messages.join('; ')}`);
      }
    }

    if (failures.length > 0) {
      return { verifier: 'esql', status: 'invalid', messages: failures };
    }
    if (checkErrors.length > 0) {
      return { verifier: 'esql', status: 'error', messages: checkErrors };
    }

    return {
      verifier: 'esql',
      status: 'valid',
      messages: [`Verified ${queries.length} ES|QL query(ies)`],
    };
  },
});
