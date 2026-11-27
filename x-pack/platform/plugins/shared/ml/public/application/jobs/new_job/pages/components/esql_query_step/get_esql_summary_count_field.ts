/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, type ESQLAstItem } from '@elastic/esql';

const isNode = (item: ESQLAstItem | undefined): item is Exclude<ESQLAstItem, ESQLAstItem[]> =>
  item !== undefined && !Array.isArray(item);

const firstNode = (item: ESQLAstItem | undefined) => (Array.isArray(item) ? item[0] : item);

// COUNT(*) or COUNT(), which count the source documents in each output row
const isDocCount = (item: ESQLAstItem | undefined): boolean => {
  const node = firstNode(item);
  if (!isNode(node) || node.type !== 'function' || node.name.toLowerCase() !== 'count') {
    return false;
  }
  const [arg] = node.args;
  const argNode = firstNode(arg);
  return argNode === undefined || (isNode(argNode) && argNode.name === '*');
};

/**
 * Returns the column holding the document count of each row when the query aggregates its data
 * with STATS, e.g. `event_count` for `STATS event_count = COUNT(*) BY ...`. This is the job's
 * summary_count_field_name. Returns null when the query returns raw rows, or when its last STATS
 * command has no named COUNT(*) column.
 */
export const getEsqlSummaryCountField = (query: string): string | null => {
  try {
    const { root } = Parser.parse(query);
    const stats = root.commands.filter(({ name }) => name.toLowerCase() === 'stats').pop();
    if (stats === undefined) {
      return null;
    }

    for (const arg of stats.args) {
      if (isNode(arg) && arg.type === 'function' && arg.name === '=') {
        const [column, expression] = arg.args;
        const columnNode = firstNode(column);
        if (isNode(columnNode) && columnNode.type === 'column' && isDocCount(expression)) {
          return columnNode.name;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
};
