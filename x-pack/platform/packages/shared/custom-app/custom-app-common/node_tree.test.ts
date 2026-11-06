/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema } from './document_schema';
import {
  collectQueries,
  getNodeActions,
  getNodeBindings,
  getNodeQuery,
  isEmptyDocument,
} from './node_tree';

const { root } = appDocumentSchema.parse({
  root: {
    type: 'stack',
    id: 'root',
    children: [
      { type: 'stat', id: 'users-stat', title: 'Users', query: 'FROM users | STATS COUNT(*)' },
      { type: 'heading', id: 'title', text: 'Hi' },
      { type: 'table', id: 'orders-table', query: 'FROM orders' },
      {
        type: 'flyout',
        id: 'detail',
        title: 'Detail',
        children: [{ type: 'key_value', id: 'facts', query: 'FROM orders | WHERE id == ?id' }],
      },
    ],
  },
});

describe('collectQueries', () => {
  it('finds the query of every data component, wherever it is, by the id of its component', () => {
    expect(collectQueries(root)).toEqual({
      'users-stat': 'FROM users | STATS COUNT(*)',
      'orders-table': 'FROM orders',
      facts: 'FROM orders | WHERE id == ?id',
    });
  });

  it('finds nothing in a document with no data components', () => {
    const plain = appDocumentSchema.parse({
      root: { type: 'stack', id: 'root', children: [{ type: 'text', id: 'a', text: 'hi' }] },
    });

    expect(collectQueries(plain.root)).toEqual({});
  });

  it('keeps two components with the same query apart', () => {
    const twins = appDocumentSchema.parse({
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'stat', id: 'a', title: 'A', query: 'ROW 1' },
          { type: 'table', id: 'b', query: 'ROW 1' },
        ],
      },
    });

    expect(collectQueries(twins.root)).toEqual({ a: 'ROW 1', b: 'ROW 1' });
  });

  it('finds the query of a root that is itself a data component', () => {
    const single = appDocumentSchema.parse({ root: { type: 'table', id: 't', query: 'ROW 1' } });

    expect(collectQueries(single.root)).toEqual({ t: 'ROW 1' });
  });
});

describe('getNodeQuery', () => {
  it('returns the query of a data component and nothing for the others', () => {
    expect(getNodeQuery(root)).toBeUndefined();
    const [stat, heading, table] = (root as { children: Array<typeof root> }).children;

    expect(getNodeQuery(stat)).toBe('FROM users | STATS COUNT(*)');
    expect(getNodeQuery(table)).toBe('FROM orders');
    expect(getNodeQuery(heading)).toBeUndefined();
  });
});

describe('isEmptyDocument', () => {
  const parse = (node: unknown) => appDocumentSchema.parse({ root: node });

  it('is true for a stack with nothing in it, which is how a new app starts', () => {
    expect(isEmptyDocument(parse({ type: 'stack', id: 'root', children: [] }))).toBe(true);
  });

  it('is false once there is a component, whatever it is', () => {
    expect(
      isEmptyDocument(
        parse({ type: 'stack', id: 'root', children: [{ type: 'text', id: 't', text: '' }] })
      )
    ).toBe(false);
  });

  it('is false for a root that is a component itself, even a very small one', () => {
    expect(isEmptyDocument(parse({ type: 'text', id: 't', text: '' }))).toBe(false);
  });

  it('is false for a flyout with nothing in it, which is a component and not a blank app', () => {
    expect(isEmptyDocument(parse({ type: 'flyout', id: 'f', title: 'x', children: [] }))).toBe(
      false
    );
  });
});

describe('getNodeActions of a button', () => {
  it('is what happens when it is pressed', () => {
    const action = { type: 'runWorkflow' as const, workflow: 'isolate', inputs: {} };
    const parsed = appDocumentSchema.parse({
      root: { type: 'button', id: 'go', label: 'Go', onClick: [action] },
    });

    expect(getNodeActions(parsed.root)).toEqual([{ event: 'onClick', actions: [action] }]);
  });
});

describe('forms in the tree', () => {
  const { root: form } = appDocumentSchema.parse({
    state: { a: { type: 'string', default: '' }, b: { type: 'string', default: '' } },
    root: {
      type: 'form',
      id: 'ask',
      submitLabel: 'Send',
      fields: [
        { bind: 'a', kind: 'text', label: 'A' },
        { bind: 'b', kind: 'text', label: 'B' },
      ],
      onSubmit: [{ type: 'setState', key: 'a', value: 'x' }],
    },
  });

  it('binds a value for each of its fields', () => {
    expect(getNodeBindings(form)).toEqual(['a', 'b']);
  });

  it('binds the value of an input, and nothing for what has none', () => {
    expect(
      getNodeBindings({ type: 'search', id: 's', label: 'S', bind: 'q', onChange: [] })
    ).toEqual(['q']);
    expect(getNodeBindings({ type: 'heading', id: 'h', text: 'H' })).toEqual([]);
  });

  it('runs its actions when it is submitted', () => {
    expect(getNodeActions(form)).toEqual([
      { event: 'onSubmit', actions: [{ type: 'setState', key: 'a', value: 'x' }] },
    ]);
  });
});
