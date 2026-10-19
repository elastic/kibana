/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { buildJsxShim } from '@elastic/isomer-sdk/author';
import type { SlackBlock, SlackTableBlock } from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { TableNode } from '.';
import { MAX_TABLE_CELLS } from './table';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Code, Composition, Fields, Markdown, Table, toComposition } =
  buildJsxShim(componentsPrimitives);

const view = (node: TableNode) => validate({ type: 'view', body: [node] });

const services: TableNode = {
  type: 'table',
  columns: [{ label: 'Service' }, { label: 'Errors' }],
  rows: [
    ['payments', 312],
    ['search', null],
    ['checkout', 1284],
    ['cart', 312],
  ],
};

/** Checks a literal against `TableNode`, which the surfaces take as any `PrimitiveNode`. */
const tableOf = (node: TableNode): TableNode => node;

const slackTable = (node: TableNode) => {
  const blocks = surfaces.slack.renderNode(node).blocks as SlackBlock[];
  const table = blocks.find((block): block is SlackTableBlock => block.type === 'table');
  const cells = (table?.rows ?? []).map((row) =>
    row.map((cell) => (cell.type === 'raw_text' ? cell.text : ''))
  );
  return { blocks, table, cells };
};

const manyRows = (count: number, cell = (index: number) => `row ${index}`): TableNode => ({
  type: 'table',
  columns: [{ label: 'Name' }],
  rows: Array.from({ length: count }, (_, index) => [cell(index)]),
});

describe('table', () => {
  it('takes 1 to 20 columns, one cell per column, and an in-range sort', () => {
    const columns = (count: number) => Array.from({ length: count }, () => ({ label: 'c' }));

    expect(view({ type: 'table', columns: columns(20), rows: [] }).valid).toBe(true);
    expect(view({ type: 'table', columns: columns(21), rows: [] }).valid).toBe(false);
    expect(view({ ...services, rows: [['a']] }).valid).toBe(false);
    expect(view({ ...services, sort: { column: 1 } }).valid).toBe(true);
    expect(view({ ...services, sort: { column: 2 } }).valid).toBe(false);
    expect(
      view({ ...services, columns: [{ label: 'a', currency: 'usd' }, { label: 'b' }] }).valid
    ).toBe(false);
    expect(view(manyRows(1000)).valid).toBe(true);
    expect(view(manyRows(1001)).valid).toBe(false);
  });

  it('takes a full table inside the input budget, and refuses a larger one with its own error', () => {
    const grid = (rows: number, columns: number): TableNode => ({
      type: 'table',
      columns: Array.from({ length: columns }, (_, index) => ({ label: `c${index}` })),
      rows: Array.from({ length: rows }, () => Array.from({ length: columns }, () => 1)),
    });

    expect(view(grid(MAX_TABLE_CELLS / 10, 10)).valid).toBe(true);
    expect(view(grid(500, SLACK_LIMITS.tableColumns)).valid).toBe(true);

    // 11,000 cells is past the table's ceiling but inside the SDK's 20,000-value budget.
    const result = view(grid(MAX_TABLE_CELLS / 10, 11));
    expect(result.valid).toBe(false);
    expect(JSON.stringify(result)).toContain(`at most ${MAX_TABLE_CELLS} cells`);
    expect(JSON.stringify(result)).not.toContain('values');
  });

  it('sorts numbers numerically, strings naturally, and empty cells last, stably', () => {
    const errors = (direction: 'asc' | 'desc') =>
      slackTable({ ...services, sort: { column: 1, direction } }).cells.map(([name]) => name);

    expect(errors('asc')).toEqual(['Service', 'payments', 'cart', 'checkout', 'search']);
    expect(errors('desc')).toEqual(['Service', 'checkout', 'payments', 'cart', 'search']);
    expect(
      slackTable({
        type: 'table',
        columns: [{ label: 'Host' }],
        rows: [['host-10'], ['host-9'], [null], ['host-1']],
        sort: { column: 0 },
      }).cells.map(([host]) => host)
    ).toEqual(['Host', 'host-1', 'host-9', 'host-10', '']);
  });

  it('renders a native Slack table, numbers aligned right', () => {
    expect(slackTable(services).blocks).toEqual([
      {
        type: 'table',
        rows: [
          [
            { type: 'raw_text', text: 'Service' },
            { type: 'raw_text', text: 'Errors' },
          ],
          [
            { type: 'raw_text', text: 'payments' },
            { type: 'raw_text', text: '312' },
          ],
          [
            { type: 'raw_text', text: 'search' },
            { type: 'raw_text', text: '' },
          ],
          [
            { type: 'raw_text', text: 'checkout' },
            { type: 'raw_text', text: '1,284' },
          ],
          [
            { type: 'raw_text', text: 'cart' },
            { type: 'raw_text', text: '312' },
          ],
        ],
        column_settings: [
          { align: 'left', is_wrapped: true },
          { align: 'right', is_wrapped: true },
        ],
      },
    ]);
  });

  it('formats each column through its format', () => {
    const { cells, table } = slackTable({
      type: 'table',
      columns: [
        { label: 'Size', format: 'bytes' },
        { label: 'Rate', format: 'percent', precision: 1 },
        { label: 'Cost', format: 'currency', currency: 'EUR' },
        { label: 'When', format: 'date' },
        { label: 'Note', align: 'center' },
      ],
      rows: [[5368709120, 0.042, 12.5, '2026-10-19T12:00:00Z', 'ok']],
    });

    expect(cells[1][0]).toMatch(/^5(\.0)? GB$/);
    expect(cells[1][1]).toBe('4.2%');
    expect(cells[1][2]).toBe('€12.50');
    expect(cells[1][3]).toMatch(/2026/);
    expect(table?.column_settings?.map((setting) => setting?.align)).toEqual([
      'right',
      'right',
      'right',
      'left',
      'center',
    ]);
  });

  it('cuts rows to maxRows and says how many of how many are shown', () => {
    const node: TableNode = { ...services, sort: { column: 1, direction: 'desc' }, maxRows: 2 };
    const { blocks, cells } = slackTable(node);

    expect(cells.map(([name]) => name)).toEqual(['Service', 'checkout', 'payments']);
    expect(blocks[1]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'Showing 2 of 4 rows' }],
    });
    expect(surfaces.text.renderNode(node)).toContain('Showing 2 of 4 rows');
    expect(surfaces.markdown.renderNode(node)).toContain('Showing 2 of 4 rows');
    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toContain('Showing 2 of 4 rows');
    expect(surfaces.text.renderNode(tableOf({ ...services, totalRows: 240 }))).toContain(
      'Showing 4 of 240 rows'
    );
  });

  it('shows at most 99 rows under the header in Slack', () => {
    const { blocks, cells } = slackTable(manyRows(1000));

    expect(cells).toHaveLength(SLACK_LIMITS.tableRows);
    expect(blocks[1]).toMatchObject({ elements: [{ text: 'Showing 99 of 1,000 rows' }] });
    expect(surfaces.text.renderNode(manyRows(1000)).split('\n')).toHaveLength(1002);
  });

  it('cuts rows before its cells pass Slack’s character budget, and stays a table', () => {
    const { blocks, table, cells } = slackTable(manyRows(60, () => 'x'.repeat(400)));
    const used = cells.flat().reduce((total, cell) => total + cell.length, 0);

    expect(table).toBeDefined();
    expect(used).toBeLessThanOrEqual(SLACK_LIMITS.tableCellCharsPerMessage);
    expect(cells).toHaveLength(25);
    expect(blocks[1]).toMatchObject({ elements: [{ text: 'Showing 24 of 60 rows' }] });
  });

  it('prints its headings and "No rows" when empty', () => {
    const empty: TableNode = { ...services, rows: [] };

    expect(slackTable(empty).cells).toEqual([['Service', 'Errors']]);
    expect(slackTable(empty).blocks[1]).toMatchObject({ elements: [{ text: 'No rows' }] });
    expect(surfaces.text.renderNode(empty)).toBe('Service  Errors\n-------  ------\n\nNo rows');
  });

  it('pads a text grid, numbers to the right, wide characters by code point', () => {
    expect(
      surfaces.text.renderNode(
        tableOf({
          type: 'table',
          columns: [{ label: 'Name' }, { label: 'Count' }],
          rows: [
            ['日本', 5],
            ['café', 1284],
          ],
        })
      )
    ).toBe(['Name  Count', '----  -----', '日本        5', 'café  1,284'].join('\n'));
  });

  it('renders a GFM table in Markdown, and an aligned HTML table in React', () => {
    expect(surfaces.markdown.renderNode(tableOf({ ...services, rows: [['a | b', 1]] }))).toBe(
      '| Service | Errors |\n| - | - |\n| a \\| b | 1 |'
    );
    expect(
      renderToStaticMarkup(surfaces.react.renderNode(tableOf({ ...services, rows: [['<a>', 1]] })))
    ).toBe(
      '<div class="componentsTable-root"><table class="componentsTable-table"><thead><tr>' +
        '<th scope="col" class="componentsTable-head componentsTable-left">Service</th>' +
        '<th scope="col" class="componentsTable-head componentsTable-right">Errors</th>' +
        '</tr></thead><tbody><tr>' +
        '<td class="componentsTable-cell componentsTable-left">&lt;a&gt;</td>' +
        '<td class="componentsTable-cell componentsTable-right">1</td>' +
        '</tr></tbody></table></div>'
    );
  });

  it('is authored from Table.Column and Table.Row children', () => {
    expect(
      toComposition(
        <Composition>
          <Table sort={{ column: 1, direction: 'desc' }}>
            <Table.Column>Service</Table.Column>
            <Table.Column format="number">Errors</Table.Column>
            <Table.Row>
              {'checkout'}
              {1284}
            </Table.Row>
            <Table.Row>
              {'search'}
              {null}
            </Table.Row>
            <Table.Row cells={['payments', 312]} />
          </Table>
        </Composition>
      ).body
    ).toEqual([
      tableOf({
        type: 'table',
        columns: [{ label: 'Service' }, { label: 'Errors', format: 'number' }],
        rows: [
          ['checkout', 1284],
          ['search', null],
          ['payments', 312],
        ],
        sort: { column: 1, direction: 'desc' },
      }),
    ]);
  });

  it('still takes columns and rows as props in JSX', () => {
    expect(
      toComposition(
        <Composition>
          <Table columns={[{ label: 'Service' }]} rows={[['checkout']]} />
        </Composition>
      ).body
    ).toEqual([tableOf({ type: 'table', columns: [{ label: 'Service' }], rows: [['checkout']] })]);
  });

  it('refuses a row cell that is not text, a number, or null', () => {
    const [node] = toComposition(
      <Composition>
        <Table>
          <Table.Column>Service</Table.Column>
          <Table.Row>{{ name: 'checkout' } as never}</Table.Row>
        </Table>
      </Composition>
    ).body;

    expect(view(node as TableNode).valid).toBe(false);
  });

  // The platform attachment types S6 maps, as #296051's roadmap commit 42e76c3a3f60 drafts them.
  it('lays out Agent Builder attachment compositions in Slack', () => {
    const baseUrl = 'https://kibana.example.com/s/ops';
    const render = (body: React.ReactElement) =>
      surfaces.slack.render(toComposition(<Composition>{body}</Composition>), {
        heading: false,
        baseUrl,
      }).blocks;
    // The envelope's dividers and blank spacer sections aren't the primitives' blocks.
    const isSpacing = (block: SlackBlock) =>
      block.type === 'divider' ||
      (block.type === 'section' && block.text?.text.trim() === '' && !block.fields);
    const blockTypes = (body: React.ReactElement) =>
      render(body)
        .filter((block) => !isSpacing(block))
        .map(({ type }) => type);

    expect(
      blockTypes(
        <Fields>
          <Fields.Item label="App">discover</Fields.Item>
          <Fields.Item label="Time range">now-15m to now</Fields.Item>
        </Fields>
      )
    ).toEqual(['section']);
    const esql = (
      <>
        <Markdown text="Errors by service." />
        <Code language="esql">FROM logs-* | STATS COUNT(*) BY service.name</Code>
      </>
    );
    expect(blockTypes(esql)).toEqual(['rich_text', 'rich_text']);
    expect(
      blockTypes(
        <Table
          columns={[{ label: 'Source' }, { label: 'Target' }, { label: 'Relation' }]}
          rows={[['frontend', 'checkout', 'calls']]}
        />
      )
    ).toEqual(['table']);
  });
});
