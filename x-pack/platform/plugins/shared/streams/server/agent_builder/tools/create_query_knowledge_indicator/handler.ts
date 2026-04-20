/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveQueryType, type StreamQuery, type Streams } from '@kbn/streams-schema';
import type { Logger } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';
import { validateEsqlQueryForStreamOrThrow } from '../../../lib/sig_events/validate_esql_query';

export interface QueryInput {
  id?: string;
  title: string;
  description: string;
  esql: StreamQuery['esql'];
  severity_score?: number;
  evidence?: string[];
}

export async function createQueryKnowledgeIndicatorToolHandler({
  queryClient,
  definition,
  queryInput,
  logger,
}: {
  queryClient: QueryClient;
  definition: Streams.all.Definition;
  queryInput: QueryInput;
  logger: Logger;
}): Promise<{ id: string }> {
  logger.debug(
    `ki_query_create: creating query KI for stream "${definition.name}" with title "${queryInput.title}"`
  );

  validateEsqlQueryForStreamOrThrow({
    esqlQuery: queryInput.esql.query,
    stream: definition,
  });

  const query: StreamQuery = {
    id: queryInput.id ?? uuidv4(),
    type: deriveQueryType(queryInput.esql.query),
    title: queryInput.title,
    description: queryInput.description,
    esql: queryInput.esql,
    severity_score: queryInput.severity_score,
    evidence: queryInput.evidence,
  };

  await queryClient.upsert(definition, query);

  logger.debug(
    `ki_query_create: created query KI for stream "${definition.name}" with id "${query.id}"`
  );

  return {
    id: query.id,
  };
}
