/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, customAppStateSchema, getNodeChildren } from './document_schema';
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
