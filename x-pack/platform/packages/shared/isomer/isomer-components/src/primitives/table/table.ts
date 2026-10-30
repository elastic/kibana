/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { STRUCTURED_VALUE_FORMATS, z } from '@elastic/isomer-sdk';
import { fromChildren } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

import { componentIcon, definePrimitive, plainText } from '../../lib';
import { tableReactRenderer } from './table_react';
import { tableSlackRenderer } from './table_slack';
import { noRowsNote, tableView, textTable } from './table_model';

const MAX_ROWS = 1000;

/**
 * Rows times columns. The SDK refuses a composition of more than 20,000 values (`MAX_INPUT_VALUES`),
 * counting every object, array and leaf, so a full table (about 11,150 values with its row arrays
 * and columns) leaves room for the rest of the composition, and a table past this fails here, with
 * its own error, rather than at the input budget.
 */
export const MAX_TABLE_CELLS = 10000;

const columnSchema = z
  .object({
    label: plainText(100).describe('The column heading, in plain text.'),
    format: z
      .enum(STRUCTURED_VALUE_FORMATS)
      .optional()
      .describe('How to format the column’s values, such as "bytes" or "percent".'),
    precision: z.number().int().min(0).max(6).optional().describe('Fraction digits, 0 to 6.'),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional()
      .describe('A three-letter currency code, for the "currency" format.'),
    align: z
      .enum(['left', 'center', 'right'])
      .optional()
      .describe('Defaults to right for numbers, left otherwise.'),
  })
  .strict();

const cellSchema = z.union([z.string().max(500), z.number(), z.null()]);

type RowCell = string | number | null;

/** A `<Table.Row>`'s props: its cells as a `cells` array, or as one JSX expression each. */
export interface TableRowProps {
  cells?: readonly RowCell[];
  children?: ReactNode;
}

// `<Table.Row>{'checkout'}{1284}{null}</Table.Row>` keeps each cell's type, which text children
// can't: they'd make every number a string, which sorts and formats as text.
const rowFromProps = ({ cells, children }: TableRowProps): RowCell[] => {
  if (cells) {
    return [...cells];
  }
  if (children === undefined) {
    return [];
  }
  return (Array.isArray(children) ? children : [children]).map((child) =>
    child === undefined || typeof child === 'boolean' ? null : child
  );
};

const tableSchema = z
  .object({
    type: z.literal('table'),
    columns: fromChildren(
      'column',
      z
        .array(columnSchema)
        .min(1)
        .max(SLACK_LIMITS.tableColumns)
        .describe('The columns, left to right. 1 to 20.'),
      { text: 'label' }
    ),
    rows: fromChildren(
      'row',
      z
        .array(z.array(cellSchema).max(SLACK_LIMITS.tableColumns))
        .max(MAX_ROWS)
        .describe(
          `The rows, one cell per column: plain text, a number, or null when empty. At most ${MAX_ROWS} rows and ${MAX_TABLE_CELLS} cells.`
        ),
      { toItem: rowFromProps }
    ),
    sort: z
      .object({
        column: z.number().int().min(0).describe('The index of the column to sort by.'),
        direction: z.enum(['asc', 'desc']).optional().describe('Defaults to asc.'),
      })
      .strict()
      .optional()
      .describe('Sorts the rows before they are cut to `maxRows`. Empty cells sort last.'),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(MAX_ROWS)
      .optional()
      .describe('The most rows to show. A note says how many were left out.'),
    totalRows: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('How many rows the source had, when `rows` is already a part of them.'),
  })
  .superRefine(({ columns, rows, sort }, context) => {
    if (rows.length * columns.length > MAX_TABLE_CELLS) {
      context.addIssue({
        code: 'custom',
        message: `at most ${MAX_TABLE_CELLS} cells (rows × columns); cut rows or columns, and set totalRows`,
        path: ['rows'],
      });
      return;
    }
    rows.forEach((row, index) => {
      if (row.length !== columns.length) {
        context.addIssue({
          code: 'custom',
          message: `every row needs one cell per column (${columns.length})`,
          path: ['rows', index],
        });
      }
    });
    if (sort && sort.column >= columns.length) {
      context.addIssue({
        code: 'custom',
        message: `must be the index of a column, below ${columns.length}`,
        path: ['sort', 'column'],
      });
    }
  });

/** A headed grid of values, such as query results or a graph's edges. */
export type TableNode = z.infer<typeof tableSchema> & PrimitiveNode;

const example: TableNode = {
  type: 'table',
  columns: [
    { label: 'Service' },
    { label: 'Errors', format: 'number' },
    { label: 'Error rate', format: 'percent', precision: 1 },
  ],
  rows: [
    ['checkout', 1284, 0.042],
    ['payments', 312, 0.011],
    ['search', null, null],
  ],
  sort: { column: 1, direction: 'desc' },
};

// A grid with a header row.
const icon = componentIcon(
  ({ accent, muted }) =>
    `<rect x="2.75" y="3.25" width="10.5" height="9.5" rx="1.5" stroke="${muted}"/><path d="M2.75 6.25h10.5" stroke="${accent}"/><path d="M2.75 9.5h10.5M7 6.25v6.5" stroke="${muted}"/>`
);

export const table = definePrimitive<TableNode, typeof tableSchema>({
  type: 'table',
  schema: tableSchema,
  catalog: {
    type: 'table',
    purpose: 'Rows of values under column headings, such as query results.',
    useWhen: ['The data has the same fields for each of several rows.'],
    avoidWhen: [
      'There is one row of labeled values. Use `fields`.',
      'The rows need a chart to read. Use a chart.',
    ],
    description:
      'A table of at most 10,000 cells. Every row has one cell per column, and `sort.column` is the index of a column.',
    example,
  },
  icon,
  examples: [
    example,
    {
      type: 'table',
      columns: [{ label: 'Source' }, { label: 'Target' }, { label: 'Relation' }],
      rows: [
        ['frontend', 'checkout', 'calls'],
        ['checkout', 'payments', 'calls'],
      ],
    },
    {
      type: 'table',
      columns: [{ label: 'Host' }, { label: 'Disk', format: 'bytes' }],
      rows: [
        ['host-a', 5368709120],
        ['host-b', 1073741824],
      ],
      maxRows: 1,
      totalRows: 240,
    },
  ],
  renderers: {
    react: tableReactRenderer,
    text: (node) => {
      const view = tableView(node);
      return [textTable(view), view.note ?? (view.rows.length === 0 ? noRowsNote() : undefined)]
        .filter(Boolean)
        .join('\n\n');
    },
    markdown: (node) => {
      const view = tableView(node);
      const footer = view.note ?? (view.rows.length === 0 ? noRowsNote() : undefined);
      return [
        md.table(
          view.columns.map(({ label }) => label),
          view.rows
        ),
        ...(footer ? [md.paragraph(footer)] : []),
      ];
    },
    slack: tableSlackRenderer,
  },
});
