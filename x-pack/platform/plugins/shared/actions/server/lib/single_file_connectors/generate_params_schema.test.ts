/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { connectorsSpecs } from '@kbn/connector-specs';
import { generateParamsSchema } from './generate_params_schema';
import { z } from '@kbn/zod/v4';
import { actionsConfigMock } from '../../actions_config.mock';
import { configSchema } from '../../config';

const collectSizeLimits = (node: unknown): number[] => {
  if (Array.isArray(node)) {
    return node.flatMap(collectSizeLimits);
  }
  if (typeof node !== 'object' || node === null) {
    return [];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    (key === 'maxLength' || key === 'maxBytes') && typeof value === 'number'
      ? [value]
      : collectSizeLimits(value)
  );
};

describe('generateParamsSchema', () => {
  const mockActions: ConnectorSpec['actions'] = {
    action1: {
      isTool: true,
      scope: 'read',
      input: z.object({
        message: z.string(),
        foobar: z.number(),
      }),
      handler: async (ctx, input) => null,
    },
    action2: {
      isTool: true,
      scope: 'read',
      input: z.object({
        bool: z.boolean(),
      }),
      handler: async (ctx, input) => null,
    },
    action3: {
      isTool: true,
      scope: 'read',
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
              fetchOptions: z
                .object({
                  max_content_length: z.number().positive().optional(),
                })
                .strict()
                .optional(),
            })
            .strict(),
          z
            .object({
              subAction: z.literal('action2'),
              subActionParams: z.object({
                bool: z.boolean(),
              }),
              fetchOptions: z
                .object({
                  max_content_length: z.number().positive().optional(),
                })
                .strict()
                .optional(),
            })
            .strict(),
          z
            .object({
              subAction: z.literal('action3'),
              subActionParams: z.object({}),
              fetchOptions: z
                .object({
                  max_content_length: z.number().positive().optional(),
                })
                .strict()
                .optional(),
            })
            .strict(),
        ]),
      })
    );
  });

  it('throws if actions has no keys', () => {
    expect(() => generateParamsSchema({})).toThrow('No actions defined');
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

    it('parses reserved fetchOptions', () => {
      const result = generateParamsSchema(mockActions);
      const parsed = result.schema.parse({
        subAction: 'action1',
        subActionParams: { message: 'hello', foobar: 42 },
        fetchOptions: { max_content_length: 1024 },
      });
      expect(parsed).toEqual({
        subAction: 'action1',
        subActionParams: { message: 'hello', foobar: 42 },
        fetchOptions: { max_content_length: 1024 },
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

    it('rejects unknown fetchOptions fields', () => {
      const result = generateParamsSchema(mockActions);
      expect(() =>
        result.schema.parse({
          subAction: 'action1',
          subActionParams: { message: 'x', foobar: 1 },
          fetchOptions: { unknown: true },
        })
      ).toThrow(/unknown|Unrecognized/);
    });
  });

  describe('xpack.actions.maxPayloadSize check', () => {
    const subActionParams = { message: 'hello', foobar: 42 };
    const paramsBytes = Buffer.byteLength(JSON.stringify(subActionParams), 'utf8');

    const validate = (maxPayloadBytes: number, params: Record<string, unknown>) => {
      const configurationUtilities = actionsConfigMock.create();
      configurationUtilities.getMaxPayloadBytes.mockReturnValue(maxPayloadBytes);
      const { customValidator } = generateParamsSchema(mockActions);
      return () => customValidator?.(params, { configurationUtilities });
    };

    it('accepts subActionParams at exactly the limit', () => {
      expect(validate(paramsBytes, { subAction: 'action1', subActionParams })).not.toThrow();
    });

    it('rejects subActionParams larger than the limit', () => {
      expect(validate(paramsBytes - 1, { subAction: 'action1', subActionParams })).toThrow(
        `subActionParams is ${paramsBytes} bytes, which exceeds xpack.actions.maxPayloadSize (${
          paramsBytes - 1
        } bytes)`
      );
    });

    it('measures multi-byte characters in bytes', () => {
      const multiByteParams = { message: 'ééé', foobar: 1 };
      const json = JSON.stringify(multiByteParams);
      expect(
        validate(json.length, { subAction: 'action1', subActionParams: multiByteParams })
      ).toThrow(`subActionParams is ${json.length + 3} bytes`);
    });

    it('accepts fetchOptions.max_content_length at exactly the limit', () => {
      expect(
        validate(1024, {
          subAction: 'action1',
          subActionParams,
          fetchOptions: { max_content_length: 1024 },
        })
      ).not.toThrow();
    });

    it('rejects fetchOptions.max_content_length larger than the limit', () => {
      expect(
        validate(1024, {
          subAction: 'action1',
          subActionParams,
          fetchOptions: { max_content_length: 1025 },
        })
      ).toThrow(
        'fetchOptions.max_content_length is 1025 bytes, which exceeds xpack.actions.maxPayloadSize (1024 bytes)'
      );
    });

    it.each(Object.entries(connectorsSpecs) as Array<[string, ConnectorSpec]>)(
      '%s has no input field limit above the default maxPayloadSize',
      (_exportName, spec) => {
        const defaultMaxBytes = configSchema.validate({}).maxPayloadSize.getValueInBytes();
        const tooLarge = Object.entries(spec.actions).flatMap(([actionName, { input }]) =>
          collectSizeLimits(z.toJSONSchema(input, { io: 'input', unrepresentable: 'any' }))
            .filter((limit) => limit > defaultMaxBytes)
            .map((limit) => `${actionName}: ${limit}`)
        );
        expect(tooLarge).toEqual([]);
      }
    );
  });
});
