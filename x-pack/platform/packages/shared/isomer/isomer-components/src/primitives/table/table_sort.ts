/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnhancementDefinition } from '@elastic/isomer-sdk';
import { someBodyNode } from '@elastic/isomer-sdk';

import type { TableNode } from './table';

/** The id a React host passes in `enhancements` to let readers sort tables by a column. */
export const TABLE_SORT_ENHANCEMENT = 'tableSort';

const isSortableTable = (node: unknown): boolean => {
  const { type, rows } = node as Partial<TableNode>;
  return type === 'table' && Array.isArray(rows) && rows.length > 1;
};

/**
 * Lets the reader sort a table by clicking a column heading, in a React host.
 *
 * It has no `script`: the SDK would compile one with `new Function`, which Kibana's CSP and its
 * server's `--disallow-code-generation-from-strings` both refuse. The table's React renderer sorts
 * in state instead, so request it on the React surface only: static HTML would get headings that
 * do nothing.
 */
export const tableSortEnhancement: EnhancementDefinition = {
  id: TABLE_SORT_ENHANCEMENT,
  name: 'Sortable tables',
  description: 'Click a table column heading to sort its rows; click again to reverse.',
  appliesTo: (body, walk) => someBodyNode(body, 'react', isSortableTable, walk),
};
