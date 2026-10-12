/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, customAppStateSchema } from './document_schema';
import { getNodeChildren } from './node_tree';
import { MAX_DATA_SOURCES, MAX_NODE_COUNT, MAX_NODE_DEPTH, MAX_QUERY_LENGTH } from './constants';

const stackOf = (id: string, children: unknown[] = []) => ({ type: 'stack', id, children });

const nestedStack = (depth: number): unknown =>
  depth === 1 ? stackOf('n1') : stackOf(`n${depth}`, [nestedStack(depth - 1)]);

describe('appDocumentSchema', () => {
  it('parses a nested document and applies defaults', () => {
    const result = appDocumentSchema.parse({
      root: stackOf('root', [
        { type: 'heading', id: 'title', text: 'Hello' },
        { type: 'callout', id: 'note', title: 'Heads up' },
      ]),
    });

    expect(result.dataSources).toEqual({});
    expect(result.state).toEqual({});
    expect(result.root).toEqual({
      type: 'stack',
      id: 'root',
      direction: 'vertical',
      gap: 'm',
      children: [
        { type: 'heading', id: 'title', text: 'Hello', size: 'm' },
        { type: 'callout', id: 'note', title: 'Heads up', color: 'primary' },
      ],
    });
  });

  it('rejects an unknown node type', () => {
    const result = appDocumentSchema.safeParse({ root: { type: 'sparkles', id: 'a' } });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown node type nested in a stack', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [{ type: 'sparkles', id: 'a' }]),
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate node ids', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [
        { type: 'text', id: 'same', text: 'a' },
        { type: 'text', id: 'same', text: 'b' },
      ]),
    });
    expect(result.success ? [] : result.error.issues.map(({ message }) => message)).toContain(
      'Duplicate node id "same"'
    );
  });

  it('rejects ids with unsupported characters', () => {
    expect(
      appDocumentSchema.safeParse({ root: { type: 'text', id: 'has space', text: 'a' } }).success
    ).toBe(false);
  });

  it('accepts nesting at the depth limit and rejects one level beyond it', () => {
    expect(appDocumentSchema.safeParse({ root: nestedStack(MAX_NODE_DEPTH) }).success).toBe(true);
    expect(appDocumentSchema.safeParse({ root: nestedStack(MAX_NODE_DEPTH + 1) }).success).toBe(
      false
    );
  });

  it('rejects a document over the node limit', () => {
    const children = Array.from({ length: MAX_NODE_COUNT }, (_, index) => ({
      type: 'text',
      id: `t${index}`,
      text: 'a',
    }));
    // Stacks cap their own children, so spread them over several stacks.
    const chunks = Array.from({ length: Math.ceil(children.length / 40) }, (_, index) =>
      stackOf(`s${index}`, children.slice(index * 40, index * 40 + 40))
    );

    const result = appDocumentSchema.safeParse({ root: stackOf('root', chunks) });
    expect(result.success ? [] : result.error.issues.map(({ message }) => message)).toEqual([
      `A document may hold at most ${MAX_NODE_COUNT} nodes`,
    ]);
  });
});

describe('data sources and stat nodes', () => {
  const statDocument = (overrides: Record<string, unknown> = {}) => ({
    dataSources: { users: { type: 'esql', query: 'ROW active = 1284' } },
    root: { type: 'stat', id: 'active', title: 'Active users', source: 'users', ...overrides },
  });

  it('parses a stat bound to an existing data source and applies the default format', () => {
    const result = appDocumentSchema.parse(statDocument());
    expect(result.root).toEqual({
      type: 'stat',
      id: 'active',
      title: 'Active users',
      source: 'users',
      format: 'number',
    });
  });

  it('rejects a stat that refers to a data source that does not exist', () => {
    const result = appDocumentSchema.safeParse(statDocument({ source: 'missing' }));
    expect(result.success ? [] : result.error.issues.map(({ message }) => message)).toEqual([
      'Node "active" refers to unknown data source "missing"',
    ]);
  });

  it('reports structural issues first, then reference issues in document order', () => {
    expect(
      issuesOf({
        root: stackOf('root', [
          { type: 'text', id: 'dup', text: 'a' },
          { type: 'stat', id: 'second', title: 't', source: 'nope' },
          { type: 'text', id: 'dup', text: 'b' },
        ]),
      })
    ).toEqual(['Duplicate node id "dup"', 'Node "second" refers to unknown data source "nope"']);
  });

  it('finds the unknown source of a stat nested in a stack', () => {
    const result = appDocumentSchema.safeParse({
      root: stackOf('root', [{ type: 'stat', id: 's', title: 't', source: 'nope' }]),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty query and a query over the length limit', () => {
    const withQuery = (query: string) =>
      appDocumentSchema.safeParse({
        ...statDocument(),
        dataSources: { users: { type: 'esql', query } },
      }).success;

    expect(withQuery('')).toBe(false);
    expect(withQuery('x'.repeat(MAX_QUERY_LENGTH))).toBe(true);
    expect(withQuery('x'.repeat(MAX_QUERY_LENGTH + 1))).toBe(false);
  });

  it('rejects a data source type other than esql', () => {
    const result = appDocumentSchema.safeParse({
      ...statDocument(),
      dataSources: { users: { type: 'sql', query: 'SELECT 1' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a document over the data source limit', () => {
    const dataSources = Object.fromEntries(
      Array.from({ length: MAX_DATA_SOURCES + 1 }, (_, index) => [
        `s${index}`,
        { type: 'esql', query: 'ROW a = 1' },
      ])
    );
    const result = appDocumentSchema.safeParse({
      dataSources,
      root: { type: 'text', id: 'a', text: 'hi' },
    });
    expect(result.success ? [] : result.error.issues.map(({ message }) => message)).toEqual([
      `A document may hold at most ${MAX_DATA_SOURCES} data sources`,
    ]);
  });
});

const issuesOf = (input: unknown): string[] => {
  const result = appDocumentSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map(({ message }) => message);
};

const SOURCES = { orders: { type: 'esql', query: 'FROM orders | LIMIT 10' } };

describe('state declarations', () => {
  const withState = (state: unknown) => ({
    state,
    root: { type: 'text', id: 'a', text: 'hi' },
  });

  it('parses typed state with defaults', () => {
    const result = appDocumentSchema.parse(
      withState({
        service: { type: 'string', default: 'checkout' },
        limit: { type: 'number', default: 10 },
        compact: { type: 'boolean', default: false },
      })
    );
    expect(result.state.limit).toEqual({ type: 'number', default: 10 });
  });

  it('requires a default that matches the declared type', () => {
    expect(issuesOf(withState({ a: { type: 'number', default: 'ten' } }))).not.toEqual([]);
    expect(issuesOf(withState({ a: { type: 'string' } }))).not.toEqual([]);
    expect(issuesOf(withState({ a: { type: 'number', default: Infinity } }))).not.toEqual([]);
  });

  it.each(['1abc', 'has space', 'a-b', 'a.b', '', 'x'.repeat(65)])(
    'rejects %p as a state key, since it cannot be an ES|QL parameter name',
    (key) => {
      expect(issuesOf(withState({ [key]: { type: 'string', default: '' } }))).not.toEqual([]);
    }
  );

  it.each(['_tstart', '_tend', '_TSTART'])('rejects the reserved key %s', (key) => {
    expect(issuesOf(withState({ [key]: { type: 'string', default: '' } }))).not.toEqual([]);
  });

  it('rejects an over-long default string and too many keys', () => {
    expect(issuesOf(withState({ a: { type: 'string', default: 'x'.repeat(1001) } }))).not.toEqual(
      []
    );

    const tooMany = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [`k${index}`, { type: 'string', default: '' }])
    );
    expect(issuesOf(withState(tooMany))).toContain('A document may hold at most 20 state keys');
  });
});

describe('interpolation references', () => {
  const doc = (text: string) => ({
    state: { service: { type: 'string', default: 'checkout' } },
    root: { type: 'heading', id: 'title', text },
  });

  it('accepts references to declared keys', () => {
    expect(issuesOf(doc('Service {{state.service}}'))).toEqual([]);
  });

  it('rejects a reference to an undeclared key', () => {
    expect(issuesOf(doc('Service {{state.sevrice}}'))).toEqual([
      'Node "title" refers to unknown state key "sevrice"',
    ]);
  });

  it('rejects anything that looks like a reference but is not one', () => {
    expect(issuesOf(doc('{{state.service.name}}'))).toEqual([
      'Node "title" has a malformed reference in "text"; use {{state.<key>}}',
    ]);
  });

  it('checks every interpolated prop, such as a callout body and a flyout title', () => {
    expect(
      issuesOf({
        root: {
          type: 'stack',
          id: 'root',
          children: [
            { type: 'callout', id: 'c', title: 'ok', text: '{{state.nope}}' },
            { type: 'flyout', id: 'f', title: '{{state.nada}}', children: [] },
          ],
        },
      })
    ).toEqual([
      'Node "c" refers to unknown state key "nope"',
      'Node "f" refers to unknown state key "nada"',
    ]);
  });
});

describe('table, flyout and key_value nodes', () => {
  const tableDoc = (onRowClick: unknown[], extra: Record<string, unknown> = {}) => ({
    state: {
      service: { type: 'string', default: '' },
      limit: { type: 'number', default: 1 },
    },
    dataSources: SOURCES,
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'table', id: 'orders-table', source: 'orders', onRowClick },
        { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
      ],
    },
    ...extra,
  });

  it('parses a table with typed columns and a row click that fills state and opens a flyout', () => {
    const result = appDocumentSchema.parse(
      tableDoc([
        { type: 'setState', key: 'service', value: { fromColumn: 'service.name' } },
        { type: 'openFlyout', flyout: 'detail' },
      ])
    );
    const [table] = getNodeChildren(result.root);
    expect(table).toMatchObject({ type: 'table', source: 'orders' });
  });

  it('defaults a table to no actions and the flyout to size m', () => {
    const result = appDocumentSchema.parse(tableDoc([]));
    const [table, flyout] = getNodeChildren(result.root);
    expect(table).toMatchObject({ onRowClick: [] });
    expect(flyout).toMatchObject({ size: 'm', children: [] });
  });

  it('rejects an unknown data source on a table and a key_value', () => {
    expect(
      issuesOf({
        root: {
          type: 'stack',
          id: 'root',
          children: [
            { type: 'table', id: 't', source: 'x' },
            { type: 'key_value', id: 'kv', source: 'y' },
          ],
        },
      })
    ).toEqual([
      'Node "t" refers to unknown data source "x"',
      'Node "kv" refers to unknown data source "y"',
    ]);
  });

  it('finds a flyout nested inside another container', () => {
    const doc = tableDoc([{ type: 'openFlyout', flyout: 'inner' }]);
    (doc.root.children as unknown[]).push({
      type: 'stack',
      id: 'wrap',
      children: [{ type: 'flyout', id: 'inner', title: 'Inner', children: [] }],
    });
    expect(issuesOf(doc)).toEqual([]);
  });

  it('rejects opening a node that does not exist or is not a flyout', () => {
    expect(issuesOf(tableDoc([{ type: 'openFlyout', flyout: 'nope' }]))).toEqual([
      'Node "orders-table" opens "nope", which is not a flyout',
    ]);
    expect(issuesOf(tableDoc([{ type: 'openFlyout', flyout: 'orders-table' }]))).toEqual([
      'Node "orders-table" opens "orders-table", which is not a flyout',
    ]);
  });

  it('rejects setting an undeclared state key', () => {
    expect(issuesOf(tableDoc([{ type: 'setState', key: 'ghost', value: 'x' }]))).toEqual([
      'Node "orders-table" sets unknown state key "ghost"',
    ]);
  });

  it('rejects a literal that does not match the key type', () => {
    expect(issuesOf(tableDoc([{ type: 'setState', key: 'limit', value: 'ten' }]))).toEqual([
      'Node "orders-table" sets state key "limit" (number) to a string',
    ]);
    expect(issuesOf(tableDoc([{ type: 'setState', key: 'limit', value: 5 }]))).toEqual([]);
  });

  it('rejects fromInput on a table, where there is no input', () => {
    expect(
      issuesOf(tableDoc([{ type: 'setState', key: 'service', value: { fromInput: true } }]))
    ).toEqual(['Node "orders-table": fromInput is only valid on input nodes']);
  });

  it('rejects more than five actions on one event, and unknown action types', () => {
    const close = { type: 'closeFlyout' };
    expect(issuesOf(tableDoc(Array.from({ length: 6 }, () => close)))).not.toEqual([]);
    expect(issuesOf(tableDoc([{ type: 'runScript', code: 'alert(1)' }]))).not.toEqual([]);
  });

  it('rejects more table columns than the limit', () => {
    const columns = Array.from({ length: 51 }, (_, index) => ({ field: `c${index}` }));
    expect(
      issuesOf({
        dataSources: SOURCES,
        root: { type: 'table', id: 't', source: 'orders', columns },
      })
    ).not.toEqual([]);
  });

  it('validates flyout content like any other node', () => {
    expect(
      issuesOf({
        root: {
          type: 'flyout',
          id: 'f',
          title: 'Detail',
          children: [{ type: 'key_value', id: 'kv', source: 'missing' }],
        },
      })
    ).toEqual(['Node "kv" refers to unknown data source "missing"']);
  });
});

describe('customAppStateSchema', () => {
  const document = { root: { type: 'text', id: 'a', text: 'hi' } };

  it('requires the current version', () => {
    expect(customAppStateSchema.safeParse({ version: 1, document }).success).toBe(true);
    expect(customAppStateSchema.safeParse({ document }).success).toBe(false);
    expect(customAppStateSchema.safeParse({ version: 2, document }).success).toBe(false);
  });
});

describe('getNodeChildren', () => {
  it('returns children for a stack and none for leaf nodes', () => {
    const { root } = appDocumentSchema.parse({
      root: stackOf('root', [{ type: 'text', id: 'a', text: 'hi' }]),
    });
    expect(getNodeChildren(root)).toHaveLength(1);
    expect(getNodeChildren(getNodeChildren(root)[0])).toEqual([]);
  });
});
