/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { buildGroupActionsQuery, type GroupActionRow } from '../queries/group_actions_query';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchGroupActionsOptions {
  groupHashes: string[];
  abortSignal?: AbortSignal;
  expressions: ExpressionsStart;
}

/**
 * Executes an ES|QL query to fetch deactivate/snooze/tag actions for the given group hashes.
 */
export const fetchGroupActions = ({
  groupHashes,
  abortSignal,
  expressions,
}: FetchGroupActionsOptions): Promise<GroupActionRow[]> => {
  return executeEsqlQuery<GroupActionRow>({
    expressions,
    query: buildGroupActionsQuery(groupHashes).print('basic'),
    input: null,
    abortSignal,
    noCache: true,
  });
};
