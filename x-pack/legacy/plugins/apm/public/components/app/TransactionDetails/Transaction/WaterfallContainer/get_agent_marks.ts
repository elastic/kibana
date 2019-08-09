/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { Transaction } from '../../../../../../typings/es_schemas/ui/Transaction';

export interface AgentMark {
  name: string;
  us: number;
}

export function getAgentMarks(transaction: Transaction): AgentMark[] {
  if (!(transaction.transaction.marks && transaction.transaction.marks.agent)) {
    return [];
  }

  return sortBy(
    Object.entries(transaction.transaction.marks.agent).map(([name, ms]) => ({
      name,
      us: ms * 1000
    })),
    'us'
  );
}
