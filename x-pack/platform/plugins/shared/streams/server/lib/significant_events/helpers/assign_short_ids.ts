/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ShortIdTable } from '@kbn/inference-common';
import { v4 } from 'uuid';
import type { VerifiedQueries, VerifiedQuery } from './verify_queries';

type Id = string;
type QueryWithShortId = VerifiedQuery & { id: Id; shortId: string };
type QueriesByShortId = Map<Id, Omit<QueryWithShortId, 'shortId'>>;

interface AssignShortIds {
  queriesWithShortIds: QueryWithShortId[];
  queriesByShortId: QueriesByShortId;
}

export function assignShortIds(verifiedQueries: VerifiedQueries): AssignShortIds {
  const idLookupTable = new ShortIdTable();

  const queriesWithShortIds = verifiedQueries.queries.map((query) => {
    const id = v4();
    const shortId = idLookupTable.take(id);
    return { id, shortId, ...query };
  });

  const queriesByShortId = new Map(
    queriesWithShortIds.map(({ shortId, ...query }) => [shortId, query])
  );

  return { queriesWithShortIds, queriesByShortId };
}
