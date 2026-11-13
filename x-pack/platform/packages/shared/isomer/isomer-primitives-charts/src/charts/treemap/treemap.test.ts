/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  authoringSchemaSubset,
  buildAuthoringJsonSchema,
  definePrimitive,
} from '@elastic/isomer-sdk';

import { rulesOf } from '../../model/cross_field';
import { selectionEvent } from '../../model/selection';
import { MAX_DATA_POINTS } from '../../model/text';

import { catalog } from './catalog';
import { examples } from './examples';
import { resolveTreemap } from './model';
import { read } from './read';
import { schema, type TreemapItem, type TreemapNode } from './schema';
import { MAX_TREE_DEPTH } from './walk';

const base: TreemapNode = {
  type: 'treemap',
  items: [
    {
      label: 'a',
      children: [
        { label: 'a1', value: 3 },
        { label: 'a2', value: 1 },
      ],
    },
    { label: 'b', value: 4 },
  ],
};

const messages = (node: unknown): string[] =>
  schema.safeParse(node).error?.issues.map(({ message }) => message) ?? [];

const valid = (node: unknown) => messages(node).length === 0;

const withItems = (items: unknown) => ({ ...base, items });

/** A chain of `levels` items, each the only child of the one above. */
const chain = (levels: number): TreemapItem => {
  let item: TreemapItem = { label: `level-${levels}`, value: 1 };
  for (let level = levels - 1; level >= 1; level -= 1) {
    item = { label: `level-${level}`, children: [item] };
  }
  return item;
};

const byTitle = (title: string) => examples.find((node) => node.title === title)!;

describe('treemap schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect({ title: node.title, errors: messages(node) }).toEqual({
        title: node.title,
        errors: [],
      });
    }
  });

  it('needs a value on every leaf, and none below zero', () => {
    const rule = 'an item without `children` has a `value`';
    expect(valid(withItems([{ label: 'a', value: 0 }]))).toBe(true);
    expect(messages(withItems([{ label: 'a' }]))).toContain(rule);
    expect(messages(withItems([{ label: 'p', children: [{ label: 'c' }] }]))).toContain(rule);
    expect(valid(withItems([{ label: 'a', value: -1 }]))).toBe(false);
  });

  it('needs a parent’s stated value to equal its children’s sum, within float error', () => {
    const rule = 'a parent’s `value`, when given, equals the sum of its children’s values';
    const parent = (value: number) =>
      withItems([
        {
          label: 'p',
          value,
          children: [
            { label: 'x', value: 0.1 },
            { label: 'y', value: 0.2 },
          ],
        },
      ]);
    expect(valid(parent(0.3))).toBe(true);
    expect(messages(parent(0.4))).toContain(rule);
    expect(
      schema.safeParse(parent(0.4)).error?.issues.find(({ message }) => message === rule)?.path
    ).toEqual(['items', 0, 'value']);
  });

  it('sums a nested parent from its own children before checking the one above', () => {
    const rule = 'a parent’s `value`, when given, equals the sum of its children’s values';
    const nested = (outer: number) =>
      withItems([
        {
          label: 'outer',
          value: outer,
          children: [
            { label: 'inner', children: [{ label: 'leaf', value: 5 }] },
            { label: 'side', value: 2 },
          ],
        },
      ]);
    expect(valid(nested(7))).toBe(true);
    expect(messages(nested(5))).toContain(rule);
  });

  it('needs a non-empty children array', () => {
    expect(valid(withItems([{ label: 'p', value: 1, children: [] }]))).toBe(false);
  });

  it('needs keys unique across the whole tree, not just among siblings', () => {
    const rule = 'item keys are unique across the whole tree';
    const cousins = (secondKey?: string) =>
      withItems([
        { label: 'p', children: [{ label: 'es-01', value: 1 }] },
        {
          label: 'q',
          children: [
            {
              label: 'es-01',
              value: 1,
              ...(secondKey === undefined ? {} : { key: secondKey }),
            },
          ],
        },
      ]);
    expect(messages(cousins())).toContain(rule);
    expect(valid(cousins('q-es-01'))).toBe(true);
    expect(messages(withItems([{ label: 'p', children: [{ label: 'p', value: 1 }] }]))).toContain(
      rule
    );
    expect(
      messages(
        withItems([
          { label: 'p', value: 1 },
          { label: 'p', value: 2 },
        ])
      )
    ).toContain(rule);
  });

  it(`nests at most ${MAX_TREE_DEPTH} levels`, () => {
    const rule = `items nest at most ${MAX_TREE_DEPTH} levels deep`;
    expect(valid(withItems([chain(MAX_TREE_DEPTH)]))).toBe(true);
    expect(messages(withItems([chain(MAX_TREE_DEPTH + 1)]))).toEqual([rule]);
    expect(messages(withItems([{ ...chain(MAX_TREE_DEPTH + 1), value: 1 }]))).toEqual([rule]);
  });

  it('stops at the depth rule before checking sums, keys, or selection', () => {
    expect(
      messages({
        ...withItems([chain(MAX_TREE_DEPTH + 1), { label: 'level-1', value: 1 }]),
        selection: {
          name: 's',
          on: { path: { z: [{ field: 'f', value: 'z' }] } },
        },
      })
    ).toEqual([`items nest at most ${MAX_TREE_DEPTH} levels deep`]);
  });

  it('needs the values to sum to a finite total', () => {
    const rule = 'the values sum to a finite total';
    expect(valid(withItems([{ label: 'a', value: Number.MAX_VALUE }]))).toBe(true);
    expect(
      messages(
        withItems([
          { label: 'a', value: 1.7e308 },
          { label: 'b', value: 1.7e308 },
        ])
      )
    ).toEqual([rule]);
    expect(
      messages(
        withItems([
          {
            label: 'p',
            value: 1,
            children: [
              { label: 'x', value: 1.7e308 },
              { label: 'y', value: 1.7e308 },
            ],
          },
        ])
      )
    ).toEqual([rule]);
  });

  it('holds at most the pack-wide number of items, parents included', () => {
    const rule = `the tree holds at most ${MAX_DATA_POINTS} items`;
    const leaves = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        label: String(index),
        value: 1,
      }));
    expect(valid(withItems(leaves(MAX_DATA_POINTS)))).toBe(true);
    expect(messages(withItems(leaves(MAX_DATA_POINTS + 1)))).toEqual([rule]);
    expect(
      messages(
        withItems([
          { label: 'p', children: leaves(MAX_DATA_POINTS - 2) },
          { label: 'q', value: 1 },
        ])
      )
    ).toEqual([]);
    expect(
      messages(
        withItems([
          { label: 'p', children: leaves(MAX_DATA_POINTS - 1) },
          { label: 'q', value: 1 },
        ])
      )
    ).toContain(rule);
  });

  it('binds selection only to keys the tree declares, at any depth', () => {
    const bound = (key: string) => ({
      ...base,
      selection: {
        name: 's',
        on: { path: { [key]: [{ field: 'f', value: key }] } },
      },
    });
    expect(valid(bound('a'))).toBe(true);
    expect(valid(bound('a2'))).toBe(true);
    expect(messages(bound('z'))).toContain(
      'every key in `selection.on` names a key the chart’s data declares: path.z'
    );
    expect(valid({ ...base, selection: { name: 's', on: { slice: {} } } })).toBe(false);
  });

  it('refuses NaN and infinite values', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(valid(withItems([{ label: 'a', value }]))).toBe(false);
    }
  });

  it('refuses fields it does not define', () => {
    expect(valid({ ...base, color: '#f00' })).toBe(false);
    expect(
      valid(withItems([{ label: 'p', children: [{ label: 'c', value: 1, color: 'red' }] }]))
    ).toBe(false);
    expect(valid({ ...base, layout: 'sunburst' })).toBe(false);
  });

  it('reports a bad leaf and a broken rule together', () => {
    const found = messages(
      withItems([
        { label: 'p', children: [{ label: 'c', value: 'one' }] },
        { label: 'p', value: 1 },
      ])
    );
    expect(found).toContain('item keys are unique across the whole tree');
    expect(found.length).toBeGreaterThan(1);
  });
});

describe('treemap authoring schema', () => {
  const primitive = definePrimitive<TreemapNode>({
    type: 'treemap',
    catalog,
    examples: [...examples],
    schema,
    renderers: {
      react: () => null,
      text: (node) => read(node).summary,
      markdown: () => [],
    },
  });
  const authoring = buildAuthoringJsonSchema([primitive]);

  const descriptions = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.flatMap(descriptions);
    }
    if (typeof value !== 'object' || value === null) {
      return [];
    }
    return Object.entries(value).flatMap(([key, entry]) =>
      key === 'description' && typeof entry === 'string' ? [entry] : descriptions(entry)
    );
  };

  it('projects the recursive item to JSON Schema as a reference', () => {
    expect(JSON.stringify(authoringSchemaSubset(authoring, ['treemap']))).toContain('"$ref"');
  });

  it('states every top-level rule in a description it keeps', () => {
    const stated = descriptions(authoringSchemaSubset(authoring, ['treemap']));
    const checks = (schema._zod.def.checks ?? []) as object[];
    const rules = checks.flatMap((check) => rulesOf(check) ?? []);
    expect(rules.length).toBe(7);
    for (const rule of rules) {
      expect({
        rule,
        stated: stated.some((description) => description.includes(rule)),
      }).toEqual({ rule, stated: true });
    }
  });
});

describe('resolveTreemap', () => {
  it('sums parents, keys paths root first, and orders depth first as authored', () => {
    const { parts, roots, total, layout } = resolveTreemap(base);
    expect(
      parts.map(({ key, keyPath, value, depth, parent, children }) => ({
        key,
        keyPath,
        value,
        depth,
        parent,
        children,
      }))
    ).toEqual([
      {
        key: 'a',
        keyPath: ['a'],
        value: 4,
        depth: 0,
        parent: undefined,
        children: [1, 2],
      },
      {
        key: 'a1',
        keyPath: ['a', 'a1'],
        value: 3,
        depth: 1,
        parent: 0,
        children: [],
      },
      {
        key: 'a2',
        keyPath: ['a', 'a2'],
        value: 1,
        depth: 1,
        parent: 0,
        children: [],
      },
      {
        key: 'b',
        keyPath: ['b'],
        value: 4,
        depth: 0,
        parent: undefined,
        children: [],
      },
    ]);
    expect(roots).toEqual([0, 3]);
    expect(total).toBe(8);
    expect(layout).toBe('rectangles');
  });

  it('uses keys over labels and keeps the layout given', () => {
    const { parts, layout } = resolveTreemap(byTitle('Shards by cluster and node'));
    expect(parts.map(({ keyPath }) => keyPath)).toEqual([
      ['prod'],
      ['prod', 'prod-es-01'],
      ['prod', 'prod-es-02'],
      ['staging'],
      ['staging', 'staging-es-01'],
    ]);
    expect(parts[4]!.labelPath).toEqual(['staging', 'es-01']);
    expect(resolveTreemap(byTitle('Open alerts by tactic')).layout).toBe('rings');
    expect(layout).toBe('rectangles');
  });

  it('apportions shares so top-level items sum to 100 and siblings to their parent', () => {
    const shares = (items: TreemapItem[]) =>
      resolveTreemap({ type: 'treemap', items }).parts.map(({ share }) => share);
    expect(
      shares([
        { label: 'a', value: 1 },
        { label: 'b', value: 1 },
        { label: 'c', value: 1 },
      ])
    ).toEqual([33.4, 33.3, 33.3]);
    expect(
      shares([
        {
          label: 'p',
          children: [
            { label: 'x', value: 1 },
            { label: 'y', value: 1 },
            { label: 'z', value: 1 },
          ],
        },
        { label: 'q', value: 2 },
      ])
    ).toEqual([60, 20, 20, 20, 40]);
    expect(
      shares([
        { label: 'p', children: [{ label: 'x', value: 0 }] },
        { label: 'q', value: 1 },
      ])
    ).toEqual([0, 0, 100]);
    expect(shares([{ label: 'a', value: 0 }])).toEqual([null]);
  });

  it('keeps every sibling group summing to its parent’s share', () => {
    const { parts, roots } = resolveTreemap(byTitle('Open alerts by tactic'));
    const sum = (indexes: readonly number[]) =>
      Math.round(indexes.reduce((total, index) => total + parts[index]!.share! * 10, 0));
    expect(sum(roots)).toBe(1000);
    for (const { children, share } of parts) {
      if (children.length > 0) {
        expect(sum(children)).toBe(Math.round(share! * 10));
      }
    }
  });

  it('prints a key after a label its sibling shares, and only there', () => {
    const { parts } = resolveTreemap({
      type: 'treemap',
      items: [
        {
          label: 'p',
          children: [
            { key: 'p-other', label: 'Other', value: 1 },
            { key: 'p-other-2', label: 'Other', value: 1 },
          ],
        },
        {
          label: 'q',
          children: [{ key: 'q-other', label: 'Other', value: 1 }],
        },
      ],
    });
    expect(parts.map(({ printedPath }) => printedPath)).toEqual([
      ['p'],
      ['p', 'Other (p-other)'],
      ['p', 'Other (p-other-2)'],
      ['q'],
      ['q', 'Other'],
    ]);
  });

  it('walks a tree at the depth bound without recursion', () => {
    const { parts } = resolveTreemap({
      type: 'treemap',
      items: [chain(MAX_TREE_DEPTH)],
    });
    expect(parts).toHaveLength(MAX_TREE_DEPTH);
    expect(parts.at(-1)!.depth).toBe(MAX_TREE_DEPTH - 1);
    expect(parts.every(({ value }) => value === 1)).toBe(true);
  });
});

describe('read', () => {
  it('prints one row per item with its path, value, and share of the whole', () => {
    expect(read(base).table).toEqual({
      columns: ['Path', 'Value', 'Share'],
      rows: [
        ['a', '4', '50%'],
        ['a › a1', '3', '37.5%'],
        ['a › a2', '1', '12.5%'],
        ['b', '4', '50%'],
      ],
    });
  });

  it('formats values with the node’s format', () => {
    expect(read(byTitle('Memory used by host')).table.rows[0]).toEqual(['web-01', '12 GB', '7.3%']);
  });

  it('summarizes the largest top-level item, first on a tie', () => {
    expect(read(base).summary).toBe('a is the largest of 2 top-level items: 4, 50% of the total.');
    expect(read(examples[0]!).summary).toBe(
      'frozen is the largest of 3 top-level items: 2 TB, 55.6% of the total.'
    );
  });

  it('steps through a lone top-level item to the first level that branches', () => {
    expect(read(byTitle('Cloud spend by account')).summary).toBe(
      'production is the largest of 3 items in All accounts: $1,000.20, 80% of the total.'
    );
  });

  it('summarizes a lone chain by its leaf', () => {
    expect(read({ type: 'treemap', items: [chain(3)] }).summary).toBe(
      'level-1 › level-2 › level-3 holds the whole total: 1.'
    );
  });

  it('summarizes an all-zero tree without dividing by zero', () => {
    const zero = read({
      type: 'treemap',
      items: [
        { label: 'a', value: 0 },
        { label: 'b', value: 0 },
      ],
    });
    expect(zero.summary).toBe('Every value is zero.');
    expect(zero.table.rows).toEqual([
      ['a', '0', '—'],
      ['b', '0', '—'],
    ]);
  });
});

describe('treemap selection', () => {
  it('resolves a leaf click root first, ANDing each key’s predicates along the path', () => {
    const selectable = byTitle('Shards by cluster and node');
    expect(
      selectionEvent(selectable.selection!, {
        path: ['staging', 'staging-es-01'],
      }).context?.predicates
    ).toEqual([
      { field: 'orchestrator.cluster.name', value: 'staging' },
      { field: 'host.name', value: 'es-01' },
    ]);
  });
});
