/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock, SlackTableCell } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS, escapeMrkdwn } from '@elastic/isomer-sdk/slack';

import type { TableNode } from './table';
import { noRowsNote, rowsNote, tableView } from './table_model';

const cell = (text: string): SlackTableCell => ({ type: 'raw_text', text });

const chars = (row: readonly string[]): number =>
  row.reduce((total, text) => total + text.length, 0);

const note = (text: string): SlackBlock => ({
  type: 'context',
  elements: [{ type: 'mrkdwn', text: escapeMrkdwn(text) }],
});

/**
 * A native `table` block: the header row, then as many rows as fit both Slack's row cap and its
 * cell-character budget, so a large table is cut by row rather than degraded. A `context` note
 * follows when rows were cut.
 */
export const tableSlackRenderer = (node: TableNode): SlackBlock[] => {
  const view = tableView(node, SLACK_LIMITS.tableRows - 1);
  const head = view.columns.map(({ label }) => label);

  let budget = SLACK_LIMITS.tableCellCharsPerMessage - chars(head);
  const rows: Array<readonly string[]> = [];
  for (const row of view.rows) {
    budget -= chars(row);
    if (budget < 0) {
      break;
    }
    rows.push(row);
  }

  const total = Math.max(node.totalRows ?? 0, node.rows.length);
  const footer =
    total === 0 ? noRowsNote() : rows.length < total ? rowsNote(rows.length, total) : undefined;

  return [
    {
      type: 'table',
      rows: [head, ...rows].map((row) => row.map(cell)),
      column_settings: view.columns.map(({ align }) => ({ align, is_wrapped: true })),
    },
    ...(footer ? [note(footer)] : []),
  ];
};
