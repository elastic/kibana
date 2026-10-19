/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Ported from elastic/isomer's slides pack: every Slack slot of the data primitives whose limit is
// below what its schema accepts stays within that limit at the schema's maximum. Text that fits is
// kept whole; past that, the slot is clamped with an ellipsis or cut by row with a note, the
// policy the rest of this pack follows.

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type {
  SlackBlock,
  SlackRichTextBlockElement,
  SlackRichTextInline,
  SlackSectionBlock,
  SlackTableBlock,
} from '@elastic/isomer-sdk/slack';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

import { componentsPack } from './pack';
import type { CodeNode, FieldsNode, LinkNode, TableNode } from './primitives';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });

const BASE_URL = 'https://kibana.example.com/base/s/ops';

const render = (node: PrimitiveNode): SlackBlock[] =>
  surfaces.slack.renderNode(node, { baseUrl: BASE_URL }).blocks as SlackBlock[];

const valid = (node: PrimitiveNode) => validate({ type: 'view', body: [node] }).valid;

const long = (length: number, char = 'x') => char.repeat(length);

interface TextSlot {
  name: string;
  limit: number;
  /** One character of filler, and how many characters it prints as. */
  filler: 'x' | '&';
  /** The longest filler the schema accepts. */
  max: number;
  node: (fill: string) => PrimitiveNode;
  /** The slot's text in the rendered blocks. */
  slot: (blocks: SlackBlock[]) => string;
  /** What the render at the schema's maximum keeps, past the limit. */
  past: (blocks: SlackBlock[], fill: string) => void;
}

const firstField = (blocks: SlackBlock[]) =>
  (blocks[0] as SlackSectionBlock).fields?.[0]?.text ?? '';

const sectionText = (blocks: SlackBlock[]) => {
  const [block] = blocks;
  return block?.type === 'section' ? block.text?.text ?? '' : '';
};

const fieldsNode = (fill: string): FieldsNode => ({
  type: 'fields',
  items: [{ label: 'Note', value: fill }],
});

const linkNode = (fill: string): LinkNode => ({
  type: 'link',
  label: 'Open',
  app: 'discover',
  path: `/${fill}`,
});

const textSlots: TextSlot[] = [
  {
    name: 'a fields value',
    limit: SLACK_LIMITS.sectionFieldChars,
    filler: '&',
    max: 1000,
    node: fieldsNode,
    slot: firstField,
    past: (blocks) => expect(firstField(blocks)).toMatch(/^\*Note\*\n(&amp;)+…$/),
  },
  {
    name: 'a link section, from an app path',
    limit: SLACK_LIMITS.sectionTextChars,
    filler: '&',
    max: 1999,
    node: linkNode,
    slot: sectionText,
    // Past the section, the whole URL moves to a rich-text link, which needs no escaping.
    past: (blocks, fill) =>
      expect(blocks).toEqual([
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [{ type: 'link', url: `${BASE_URL}/app/discover/${fill}`, text: 'Open' }],
            },
          ],
        },
      ]),
  },
];

/** What one filler character prints as in `mrkdwn`. */
const printed = (filler: TextSlot['filler']) => (filler === '&' ? '&amp;' : 'x');

describe('Slack slots below their schema cap', () => {
  it.each(textSlots)('$name keeps its text whole up to the limit and stays within it', (row) => {
    const fits = (length: number) => row.slot(render(row.node(long(length, row.filler))));
    const whole = (length: number) => fits(length).includes(printed(row.filler).repeat(length));

    let low = 0;
    let high = row.max;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (whole(mid) && fits(mid).length <= row.limit) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    expect(low).toBeGreaterThan(0);
    expect(fits(low).length).toBeLessThanOrEqual(row.limit);
    expect(low).toBeLessThan(row.max);

    const fill = long(row.max, row.filler);
    const blocks = render(row.node(fill));
    expect(valid(row.node(fill))).toBe(true);
    row.past(blocks, fill);
    for (const block of blocks) {
      if (block.type === 'section') {
        expect(block.text?.text.length ?? 0).toBeLessThanOrEqual(SLACK_LIMITS.sectionTextChars);
        for (const field of block.fields ?? []) {
          expect(field.text.length).toBeLessThanOrEqual(SLACK_LIMITS.sectionFieldChars);
        }
      }
    }
  });

  const tableCells = (blocks: SlackBlock[]) => {
    const table = blocks.find((block): block is SlackTableBlock => block.type === 'table');
    return (table?.rows ?? []).map((row) =>
      row.map((cell) => (cell.type === 'raw_text' ? cell.text : ''))
    );
  };

  const note = (blocks: SlackBlock[]) =>
    JSON.stringify(blocks.filter(({ type }) => type === 'context'));

  it('cuts a table at the schema maximum to Slack’s rows and cell characters, with a note', () => {
    const node: TableNode = {
      type: 'table',
      // 1,000 rows of 10 cells stays inside the SDK's input budget of 20,000 values.
      columns: Array.from({ length: 10 }, (_, index) => ({ label: `c${index}` })),
      rows: Array.from({ length: 1000 }, () => Array.from({ length: 10 }, () => long(80))),
    };
    expect(valid(node)).toBe(true);

    const blocks = render(node);
    const cells = tableCells(blocks);

    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length).toBeLessThanOrEqual(SLACK_LIMITS.tableRows);
    expect(cells.every((row) => row.length <= SLACK_LIMITS.tableColumns)).toBe(true);
    expect(cells.flat().join('').length).toBeLessThanOrEqual(SLACK_LIMITS.tableCellCharsPerMessage);
    expect(note(blocks)).toContain(`of 1,000 rows`);
  });

  it('cuts a table of short rows to Slack’s row cap, with a note', () => {
    const node: TableNode = {
      type: 'table',
      columns: [{ label: 'n' }],
      rows: Array.from({ length: 1000 }, (_, index) => [index]),
    };
    const blocks = render(node);

    expect(tableCells(blocks)).toHaveLength(SLACK_LIMITS.tableRows);
    expect(note(blocks)).toContain('Showing 99 of 1,000 rows');
  });

  const inlineText = (inline: SlackRichTextInline): string =>
    'text' in inline && typeof inline.text === 'string' ? inline.text : '';

  const elementText = (element: SlackRichTextBlockElement): string =>
    element.type === 'rich_text_list'
      ? element.elements.map(elementText).join('')
      : element.elements.map(inlineText).join('');

  it('keeps code at the schema maximum whole, in section-sized rich-text elements', () => {
    const text = Array.from({ length: 1000 }, (_, index) => `| EVAL f${index} = "&<>"`)
      .join('\n')
      .slice(0, 12000);
    const node: CodeNode = { type: 'code', text };
    expect(valid(node)).toBe(true);

    const elements = surfaces.slack
      .render({ type: 'view', body: [node] }, { heading: false })
      .blocks.flatMap((block) => (block.type === 'rich_text' ? block.elements : []));

    for (const element of elements) {
      expect(elementText(element).length).toBeLessThanOrEqual(SLACK_LIMITS.sectionTextChars);
    }
    expect(elements.map(elementText).join('').replace(/\n/g, '')).toBe(text.replace(/\n/g, ''));
  });
});
