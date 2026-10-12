/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, customAppStateSchema, getNodeChildren } from './document_schema';
import { MAX_NODE_COUNT, MAX_NODE_DEPTH } from './constants';

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
