/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { Transaction } from '../../../../../../../typings/es_schemas/ui/Transaction';
import { Mark } from '.';

// Extends Mark without adding new properties to it.
export interface AgentMark extends Mark {
  type: 'agentMark';
}

export function getAgentMarks(transaction?: Transaction): AgentMark[] {
  const agent = transaction?.transaction.marks?.agent;
  if (!agent) {
    return [];
  }

  return sortBy(
    Object.entries(agent).map(([name, ms]) => ({
      type: 'agentMark',
      id: name,
      offset: ms * 1000,
      verticalLine: true
    })),
    'offset'
  );
}
