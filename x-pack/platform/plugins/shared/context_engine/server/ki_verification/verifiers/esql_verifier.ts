/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

const verifyQuery = async (query: string, context: KiVerifierContext): Promise<string[]> => {
  const { errors } = await validateQuery(query);
  if (errors.length > 0) {
    return errors.map((error) => ('text' in error ? error.text : error.message));
  }

  try {
    await context.esClient.esql.query(
      { query: `${query}\n| LIMIT 0` },
      { signal: context.abortSignal, requestTimeout: '10s' }
    );
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
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
    for (const query of queries) {
      const errorMessages = await verifyQuery(query, context);
      if (errorMessages.length > 0) {
        failures.push(`Invalid ES|QL query "${query}": ${errorMessages.join('; ')}`);
      }
    }

    if (failures.length > 0) {
      return { verifier: 'esql', status: 'invalid', messages: failures };
    }

    return {
      verifier: 'esql',
      status: 'valid',
      messages: [`Verified ${queries.length} ES|QL query(ies)`],
    };
  },
});
