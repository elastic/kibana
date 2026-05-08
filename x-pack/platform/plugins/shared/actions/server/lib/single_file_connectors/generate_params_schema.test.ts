/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { generateParamsSchema } from './generate_params_schema';
import { z } from '@kbn/zod/v4';

describe('generateParamsSchema', () => {
  const mockActions: ConnectorSpec['actions'] = {
    action1: {
      isTool: true,
      input: z.object({
        message: z.string(),
        foobar: z.number(),
      }),
      handler: async (ctx, input) => null,
    },
    action2: {
      isTool: true,
      input: z.object({
        bool: z.boolean(),
      }),
      handler: async (ctx, input) => null,
    },
    action3: {
      isTool: true,
      input: z.object({}),
      handler: async (ctx, input) => null,
    },
  };

  it('generates params correctly', () => {
    expect(JSON.stringify(generateParamsSchema(mockActions))).toMatch(
      JSON.stringify({
        schema: z.discriminatedUnion('subAction', [
          z
            .object({
              subAction: z.literal('action1'),
              subActionParams: z.object({
                message: z.string(),
                foobar: z.number(),
              }),
            })
            .strict(),
          z
            .object({
              subAction: z.literal('action2'),
              subActionParams: z.object({
                bool: z.boolean(),
              }),
            })
            .strict(),
          z
            .object({
              subAction: z.literal('action3'),
              subActionParams: z.object({}),
            })
            .strict(),
        ]),
      })
    );
  });

  it('throws if actions has no keys', () => {
    expect(() => generateParamsSchema({})).toThrowError('No actions defined');
  });

  describe('runtime parse behavior', () => {
    it('parses valid params for action1', () => {
      const result = generateParamsSchema(mockActions);
      const parsed = result.schema.parse({
        subAction: 'action1',
        subActionParams: { message: 'hello', foobar: 42 },
      });
      expect(parsed).toEqual({
        subAction: 'action1',
        subActionParams: { message: 'hello', foobar: 42 },
      });
    });

    it('parses valid params for action2', () => {
      const result = generateParamsSchema(mockActions);
      const parsed = result.schema.parse({
        subAction: 'action2',
        subActionParams: { bool: true },
      });
      expect(parsed).toEqual({
        subAction: 'action2',
        subActionParams: { bool: true },
      });
    });

    it('parses valid params for action3 with empty subActionParams', () => {
      const result = generateParamsSchema(mockActions);
      const parsed = result.schema.parse({
        subAction: 'action3',
        subActionParams: {},
      });
      expect(parsed).toEqual({
        subAction: 'action3',
        subActionParams: {},
      });
    });

    it('throws for invalid subAction literal', () => {
      const result = generateParamsSchema(mockActions);
      expect(() => result.schema.parse({ subAction: 'invalid', subActionParams: {} })).toThrow();
    });

    it('throws when subActionParams is missing', () => {
      const result = generateParamsSchema(mockActions);
      expect(() => result.schema.parse({ subAction: 'action1' })).toThrow(
        /subActionParams|Required/
      );
    });

    it('throws when subActionParams has wrong shape', () => {
      const result = generateParamsSchema(mockActions);
      expect(() =>
        result.schema.parse({
          subAction: 'action1',
          subActionParams: { message: 123, foobar: 1 },
        })
      ).toThrow(/message|string|number/);
    });

    it('rejects extra keys at top level due to strict schema', () => {
      const result = generateParamsSchema(mockActions);
      expect(() =>
        result.schema.parse({
          subAction: 'action1',
          subActionParams: { message: 'x', foobar: 1 },
          extraTopLevel: true,
        })
      ).toThrow(/extraTopLevel|Unrecognized/);
    });
  });
});
