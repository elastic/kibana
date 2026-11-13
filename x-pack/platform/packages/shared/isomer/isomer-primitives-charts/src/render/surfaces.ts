/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The text surfaces: every chart reads as its title, description, a one-sentence summary, and its
// data table, in the same order on text, Markdown, and Slack.

import { type MarkdownBlock, md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock, SlackRichTextText, SlackTableCell } from '@elastic/isomer-sdk/slack';

import { type ChartTable, oneLine, textTable } from './table';

export interface ChartHeading {
  title?: string | undefined;
  description?: string | undefined;
}

/** A chart read as words and data. */
export interface ChartReading {
  /** One sentence a reader gets without the drawing, e.g. the largest value or the latest change. */
  summary: string;
  table: ChartTable;
}

export const chartText = (
  { title, description }: ChartHeading,
  { summary, table }: ChartReading
): string =>
  [title, description, summary, textTable(table)]
    .filter((part): part is string => part !== undefined)
    .map((part, index, parts) => (index < parts.length - 1 ? oneLine(part) : part))
    .join('\n\n');

export const chartMarkdown = (
  { title, description }: ChartHeading,
  { summary, table: { columns, rows } }: ChartReading
): MarkdownBlock[] => [
  ...(title === undefined ? [] : [md.paragraph(md.strong(title))]),
  ...(description === undefined ? [] : [md.paragraph(description)]),
  md.paragraph(summary),
  md.table(columns, rows),
];

const run = (text: string, bold = false): SlackRichTextText => ({
  type: 'text',
  text: oneLine(text),
  ...(bold ? { style: { bold: true } } : {}),
});

const cell = (text: string): SlackTableCell => ({
  type: 'raw_text',
  text: oneLine(text),
});

/** Without an asset collector, a chart is its words and table; with one, the dispatcher draws it instead. */
export const chartSlack = (
  { title, description }: ChartHeading,
  { summary, table: { columns, rows } }: ChartReading
): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      ...(title === undefined
        ? []
        : [
            {
              type: 'rich_text_section' as const,
              elements: [run(title, true)],
            },
          ]),
      ...[description, summary]
        .filter((part): part is string => part !== undefined)
        .map((part) => ({
          type: 'rich_text_section' as const,
          elements: [run(part)],
        })),
    ],
  },
  {
    type: 'table',
    rows: [columns, ...rows].map((row) => row.map(cell)),
    column_settings: columns.map(() => ({ is_wrapped: true })),
  },
];
