/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  checkCapability,
  defineCapability,
  describeCapability,
  getCapability,
  listCapabilities,
  nodeSchema,
  registerCapability,
} from '.';

const gauge = defineCapability({
  kind: 'component',
  id: 'gauge',
  version: 1,
  props: z.object({
    title: z.string().describe('What it measures.'),
    range: z.enum(['low', 'high']).optional().describe('Which end it leans to.'),
  }),
  doc: {
    summary: 'A dial.',
    whenToUse: 'For a value in a range.',
    example: { type: 'gauge', id: 'load', title: 'Load' },
  },
});

const panel = defineCapability({
  kind: 'component',
  id: 'panel',
  version: 1,
  props: z.object({}),
  doc: {
    summary: 'Holds other components.',
    whenToUse: 'To group.',
    example: { type: 'panel', id: 'group', children: [] },
  },
  container: true,
});

describe('the registry', () => {
  beforeAll(() => {
    registerCapability(gauge);
    registerCapability(panel);
  });

  it('gives a capability back by its id, and lists what is registered', () => {
    expect(getCapability('gauge')).toBe(gauge);
    expect(listCapabilities().map(({ id }) => id)).toEqual(
      expect.arrayContaining(['gauge', 'panel'])
    );
  });

  it('takes the same capability again, and not another with the same id', () => {
    expect(() => registerCapability(gauge)).not.toThrow();
    expect(() => registerCapability(defineCapability({ ...gauge, version: 2 }))).toThrow(
      'registered already'
    );
  });

  it('builds the schema of a node from the manifest, with what every node has', () => {
    expect(nodeSchema.safeParse({ type: 'gauge', id: 'load', title: 'Load' }).success).toBe(true);
    expect(nodeSchema.safeParse({ type: 'gauge', id: 'load' }).success).toBe(false);
    expect(nodeSchema.safeParse({ type: 'gauge', id: 'bad id', title: 'x' }).success).toBe(false);
    expect(nodeSchema.safeParse({ type: 'unknown', id: 'x' }).success).toBe(false);
    expect(
      nodeSchema.safeParse({
        type: 'gauge',
        id: 'load',
        title: 'Load',
        visibleWhen: { $state: 'show' },
      }).success
    ).toBe(true);
  });

  it('gives a container its children, each of any registered type', () => {
    expect(
      nodeSchema.safeParse({
        type: 'panel',
        id: 'group',
        children: [{ type: 'gauge', id: 'load', title: 'Load' }],
      }).success
    ).toBe(true);
    expect(
      nodeSchema.safeParse({ type: 'panel', id: 'group', children: [{ type: 'nope', id: 'x' }] })
        .success
    ).toBe(false);
  });

  it('has nothing wrong with a capability that is fit to register', () => {
    expect(checkCapability(gauge)).toEqual([]);
    expect(checkCapability(panel)).toEqual([]);
  });

  it('finds what is wrong with one that is not', () => {
    const broken = defineCapability({
      kind: 'component',
      id: 'Broken-One',
      version: 0,
      props: z.object({ text: z.string() }),
      doc: { summary: 'x', whenToUse: 'y', example: { type: 'other', id: 'a' } },
      interpolated: ['text'],
      migrations: { 3: (props) => props },
    });
    expect(checkCapability(broken)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('lowercase words'),
        expect.stringContaining('whole number'),
        expect.stringContaining('"text" has no description'),
        expect.stringContaining('migration from version 3'),
        expect.stringContaining('does not validate'),
        expect.stringContaining('must be of type "Broken-One"'),
      ])
    );
  });

  it('describes a capability for an LLM from its manifest', () => {
    expect(describeCapability(gauge)).toBe(
      '- gauge { title, range?: "low" | "high" }: A dial. For a value in a range.'
    );
    expect(describeCapability(panel)).toContain('- panel { children }');
  });
});
