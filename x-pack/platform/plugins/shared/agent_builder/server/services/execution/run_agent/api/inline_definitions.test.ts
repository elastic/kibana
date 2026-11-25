/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { dedupeInlineDefinitions, INLINE_DEFINITIONS_FILE } from './inline_definitions';

const sizable = (label: string) => ({
  type: 'object',
  description: `${label} ${'x'.repeat(300)}`,
});

const referenceTo = (name: string) => ({ $ref: `${INLINE_DEFINITIONS_FILE}#/$defs/${name}` });

const hashedName = (hint: string) => new RegExp(`^${hint}\\.[0-9a-f]{8}$`);

describe('dedupeInlineDefinitions', () => {
  it('returns the schema itself when nothing repeats', () => {
    const schema = {
      type: 'object',
      properties: { first: sizable('first'), second: sizable('second') },
    };

    const { root, definitions } = dedupeInlineDefinitions(schema);

    expect(root).toBe(schema);
    expect(definitions).toEqual({});
  });

  it('shares a repeated subtree through one definition named after its first property', () => {
    const shared = sizable('shared');
    const schema = {
      type: 'object',
      properties: { first: shared, second: { ...shared }, third: { type: 'string' } },
    };

    const { root, definitions } = dedupeInlineDefinitions(schema);

    const [name] = Object.keys(definitions);
    expect(name).toMatch(hashedName('first'));
    expect(definitions).toEqual({ [name]: shared });
    expect(root).toEqual({
      type: 'object',
      properties: {
        first: referenceTo(name),
        second: referenceTo(name),
        third: { type: 'string' },
      },
    });
  });

  it('leaves a repeated subtree too small to be worth sharing in place', () => {
    const schema = {
      type: 'object',
      properties: { first: { type: 'string' }, second: { type: 'string' } },
    };

    expect(dedupeInlineDefinitions(schema).root).toBe(schema);
  });

  it('shares repeats nested in subtrees that differ, so the copies point at one definition', () => {
    const shared = sizable('shared');
    const schema = {
      type: 'object',
      properties: {
        left: { type: 'object', properties: { inner: shared, side: { type: 'string' } } },
        right: { type: 'object', properties: { inner: shared, side: { type: 'number' } } },
      },
    };

    const { root, definitions } = dedupeInlineDefinitions(schema);

    const [name] = Object.keys(definitions);
    expect(name).toMatch(hashedName('inner'));
    expect(root).toEqual({
      type: 'object',
      properties: {
        left: {
          type: 'object',
          properties: { inner: referenceTo(name), side: { type: 'string' } },
        },
        right: {
          type: 'object',
          properties: { inner: referenceTo(name), side: { type: 'number' } },
        },
      },
    });
  });

  it('keeps what only repeats inside copies of a shared subtree inline in its definition', () => {
    const parent = {
      type: 'object',
      properties: { inner: sizable('inner'), side: sizable('side') },
    };
    const schema = {
      type: 'object',
      properties: { first: parent, second: { ...parent } },
    };

    const { root, definitions } = dedupeInlineDefinitions(schema);

    const [name] = Object.keys(definitions);
    expect(name).toMatch(hashedName('first'));
    expect(definitions).toEqual({ [name]: parent });
    expect(root).toEqual({
      type: 'object',
      properties: { first: referenceTo(name), second: referenceTo(name) },
    });
  });

  it('shares a nested subtree that also repeats outside the copies of its parent', () => {
    const inner = sizable('inner');
    const parent = { type: 'object', properties: { inner, side: { type: 'string' } } };
    const schema = {
      type: 'object',
      properties: { first: parent, second: parent, standalone: inner },
    };

    const { root, definitions } = dedupeInlineDefinitions(schema);

    const [name] = Object.keys(definitions);
    expect(name).toMatch(hashedName('inner'));
    expect(definitions).toEqual({ [name]: inner });
    const sharedParent = {
      type: 'object',
      properties: { inner: referenceTo(name), side: { type: 'string' } },
    };
    expect(root).toEqual({
      type: 'object',
      properties: { first: sharedParent, second: sharedParent, standalone: referenceTo(name) },
    });
  });

  it('finds subtrees under every keyword that holds a subschema', () => {
    const shared = sizable('shared');
    const schema = {
      type: 'object',
      properties: {
        list: { type: 'array', items: shared },
        map: { type: 'object', additionalProperties: shared, patternProperties: { '^x-': shared } },
        union: { oneOf: [shared, { type: 'string' }], anyOf: [shared], allOf: [shared] },
        tuple: { type: 'array', prefixItems: [shared] },
        negation: { not: shared },
      },
    };

    const { root, definitions } = dedupeInlineDefinitions(schema);

    const [name] = Object.keys(definitions);
    expect(Object.keys(definitions)).toHaveLength(1);
    expect(name).toMatch(hashedName('list'));
    expect(root).toEqual({
      type: 'object',
      properties: {
        list: { type: 'array', items: referenceTo(name) },
        map: {
          type: 'object',
          additionalProperties: referenceTo(name),
          patternProperties: { '^x-': referenceTo(name) },
        },
        union: {
          oneOf: [referenceTo(name), { type: 'string' }],
          anyOf: [referenceTo(name)],
          allOf: [referenceTo(name)],
        },
        tuple: { type: 'array', prefixItems: [referenceTo(name)] },
        negation: { not: referenceTo(name) },
      },
    });
  });

  it('leaves values that are not subschemas alone, even when they repeat', () => {
    const shared = sizable('shared');
    const schema = {
      type: 'object',
      properties: {
        first: { type: 'object', description: 'first', default: shared },
        second: { type: 'object', description: 'second', examples: [shared] },
        third: { type: 'object', description: 'third', $defs: { Shared: shared } },
      },
    };

    expect(dedupeInlineDefinitions(schema).root).toBe(schema);
  });

  it('replaces characters a definition name cannot carry in the property it is named after', () => {
    const shared = sizable('shared');
    const schema = {
      type: 'object',
      properties: { 'host.name': shared, 'host name': shared },
    };

    const { definitions } = dedupeInlineDefinitions(schema);

    expect(Object.keys(definitions)).toEqual([expect.stringMatching(hashedName('host_name'))]);
  });

  it('never modifies the schema it is given', () => {
    const shared = sizable('shared');
    const schema = {
      type: 'object',
      properties: {
        first: shared,
        second: { type: 'object', properties: { nested: shared, other: { type: 'string' } } },
      },
    };
    const original = cloneDeep(schema);

    dedupeInlineDefinitions(schema);

    expect(schema).toEqual(original);
  });
});
