/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from '../../../../../../typings/es_schemas/ui/Transaction';

export interface AgentMark {
  name: string;
  offset: number;
}

export function getAgentMarks(transaction?: Transaction): AgentMark[] {
  if (
    !(
      transaction &&
      transaction.transaction.marks &&
      transaction.transaction.marks.agent
    )
  ) {
    return [];
  }

  return Object.entries(transaction.transaction.marks.agent).map(
    ([name, ms]) => ({
      name,
      offset: ms * 1000
    })
  );
}
