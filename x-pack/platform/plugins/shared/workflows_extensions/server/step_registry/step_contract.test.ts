/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { buildStepContract } from './step_contract';
import type { ServerStepDefinition } from './types';
import type { CommonStepDefinition } from '../../common';

const baseDefinition: ServerStepDefinition = {
  id: 'test.step',
  label: 'Test step',
  description: 'A step for tests',
  category: StepCategory.Data,
  inputSchema: z.object({ query: z.string(), size: z.number().default(10) }),
  outputSchema: z.object({ total: z.number().default(0) }),
  handler: async () => ({ output: { total: 1 } }),
};

const createDefinition = (overrides: Partial<CommonStepDefinition> = {}): ServerStepDefinition => ({
  ...baseDefinition,
  ...overrides,
});

describe('buildStepContract', () => {
  it('reads the input as the workflow writes it, so a field with a default is optional', () => {
    const { input } = buildStepContract(createDefinition());

    expect(input).toEqual({
      type: 'object',
      properties: { query: { type: 'string' }, size: { type: 'number', default: 10 } },
      required: ['query'],
    });
  });

  it('reads the output as later steps read it, so a field with a default is required', () => {
    const { output } = buildStepContract(createDefinition());

    expect(output).toEqual({
      type: 'object',
      properties: { total: { type: 'number', default: 0 } },
      required: ['total'],
      additionalProperties: false,
    });
  });

  it('resolves the default stability and exposure', () => {
    const contract = buildStepContract(createDefinition());

    expect(contract).toMatchObject({
      id: 'test.step',
      stability: 'tech_preview',
      exposure: 'open',
    });
    expect(contract).not.toHaveProperty('config');
    expect(contract).not.toHaveProperty('deprecation');
  });

  it('includes the declared stability, exposure, deprecation and config', () => {
    const contract = buildStepContract(
      createDefinition({
        stability: 'stable',
        exposure: 'managed_only',
        deprecation: { replacementStepType: 'test.newStep' },
        configSchema: z.object({ 'connector-id': z.string() }),
      })
    );

    expect(contract).toMatchObject({
      stability: 'stable',
      exposure: 'managed_only',
      deprecation: { replacementStepType: 'test.newStep' },
      config: {
        type: 'object',
        properties: { 'connector-id': { type: 'string' } },
        required: ['connector-id'],
      },
    });
  });

  it('leaves out the label, description, category and handler', () => {
    const contract = buildStepContract(createDefinition());

    expect(Object.keys(contract).sort()).toEqual([
      'exposure',
      'id',
      'input',
      'output',
      'stability',
    ]);
  });

  it('serializes the parts JSON Schema cannot represent as any value instead of throwing', () => {
    const { input, output } = buildStepContract(
      createDefinition({
        inputSchema: z.object({ name: z.string().transform((value) => value.trim()) }),
        outputSchema: z.object({ at: z.date() }),
      })
    );

    expect(input).toMatchObject({ properties: { name: { type: 'string' } } });
    expect(output).toMatchObject({ properties: { at: {} } });
  });

  it('uses the OpenAPI 3.0 dialect', () => {
    const { input } = buildStepContract(
      createDefinition({ inputSchema: z.object({ note: z.string().nullable() }) })
    );

    expect(input).not.toHaveProperty('$schema');
    expect(input).toMatchObject({ properties: { note: { type: 'string', nullable: true } } });
  });

  it('writes a schema used in several places once, in definitions', () => {
    const address = z.object({ street: z.string(), city: z.string() });
    const { input } = buildStepContract(
      createDefinition({ inputSchema: z.object({ from: address, to: address }) })
    );

    expect(Object.values(input.definitions ?? {})).toEqual([
      {
        type: 'object',
        properties: { street: { type: 'string' }, city: { type: 'string' } },
        required: ['street', 'city'],
      },
    ]);
    const [name] = Object.keys(input.definitions ?? {});
    expect(input.properties).toEqual({
      from: { $ref: `#/definitions/${name}` },
      to: { $ref: `#/definitions/${name}` },
    });
  });
});
