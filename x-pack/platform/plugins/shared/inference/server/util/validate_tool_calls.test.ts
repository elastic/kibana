/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSchema } from '@kbn/inference-common';
import { ToolChoiceType, isToolValidationError } from '@kbn/inference-common';
import { validateToolCalls } from './validate_tool_calls';

// `ToolSchema` has no type arrays or anyOf, but LangChain tools still bring them: `resolveToolSchema`
// in @kbn/inference-langchain casts generated JSON Schema to `ToolSchema`. Model that cast here.
const asToolSchema = (schema: Record<string, unknown>): ToolSchema =>
  schema as unknown as ToolSchema;

describe('validateToolCalls', () => {
  const logger = { debug: jest.fn() };

  beforeEach(() => {
    logger.debug.mockClear();
  });

  it('throws an error if tools were called but toolChoice == none', () => {
    expect(() => {
      validateToolCalls({
        logger,
        toolCalls: [
          {
            function: {
              name: 'my_function',
              arguments: '{}',
            },
            toolCallId: '1',
          },
        ],

        toolChoice: ToolChoiceType.none,
        tools: {
          my_function: {
            description: 'description',
          },
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"tool_choice was \\"none\\" but my_function was/were called"`
    );
  });

  it('throws an error if an unknown tool was called', () => {
    expect(() =>
      validateToolCalls({
        logger,
        toolCalls: [
          {
            function: {
              name: 'my_unknown_function',
              arguments: '{}',
            },
            toolCallId: '1',
          },
        ],

        tools: {
          my_function: {
            description: 'description',
          },
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Tool \\"my_unknown_function\\" called but was not available"`
    );
  });

  it('throws an error if invalid JSON was generated', () => {
    expect(() =>
      validateToolCalls({
        logger,
        toolCalls: [
          {
            function: {
              name: 'my_function',
              arguments: '{[]}',
            },
            toolCallId: '1',
          },
        ],

        tools: {
          my_function: {
            description: 'description',
          },
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Failed parsing arguments for my_function"`);
  });

  it('throws an error if the function call has invalid arguments', () => {
    function validate() {
      validateToolCalls({
        logger,
        toolCalls: [
          {
            function: {
              name: 'my_function',
              arguments: JSON.stringify({ foo: 'bar' }),
            },
            toolCallId: '1',
          },
        ],

        tools: {
          my_function: {
            description: 'description',
            schema: {
              type: 'object',
              properties: {
                bar: {
                  type: 'string',
                },
              },
              required: ['bar'],
            },
          },
        },
      });
    }
    expect(() => validate()).toThrowErrorMatchingInlineSnapshot(
      `"Tool call arguments for my_function (1) were invalid"`
    );

    try {
      validate();
    } catch (error) {
      if (isToolValidationError(error)) {
        expect(error.meta).toEqual({
          arguments: JSON.stringify({ foo: 'bar' }),
          errorsText: 'bar: Invalid input: expected string, received undefined',
          name: 'my_function',
          toolCalls: [
            {
              function: {
                arguments: JSON.stringify({ foo: 'bar' }),
                name: 'my_function',
              },
              toolCallId: '1',
            },
          ],
        });
      } else {
        fail('Expected toolValidationError');
      }
    }
  });

  it('successfully validates and parses a valid tool call', () => {
    function runValidation() {
      return validateToolCalls({
        logger,
        toolCalls: [
          {
            function: {
              name: 'my_function',
              arguments: '{ "foo": "bar" }',
            },
            toolCallId: '1',
          },
        ],

        tools: {
          my_function: {
            description: 'description',
            schema: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                },
              },
              required: ['foo'],
            },
          },
        },
      });
    }
    expect(() => runValidation()).not.toThrow();

    const validated = runValidation();

    expect(validated).toEqual([
      {
        function: {
          name: 'my_function',
          arguments: {
            foo: 'bar',
          },
        },
        toolCallId: '1',
      },
    ]);
  });

  describe('when an object or array argument is sent as a JSON string', () => {
    const tools = {
      my_function: {
        description: 'description',
        schema: {
          type: 'object',
          properties: {
            response: {
              type: 'object',
              properties: {
                verdicts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { id: { type: 'string' } },
                    required: ['id'],
                  },
                },
                note: { type: 'string' },
              },
              required: ['verdicts'],
            },
          },
          required: ['response'],
        },
      },
    } as const;

    const validate = (args: unknown) =>
      validateToolCalls({
        logger,
        toolCalls: [
          { function: { name: 'my_function', arguments: JSON.stringify(args) }, toolCallId: '1' },
        ],
        tools,
      });

    it('parses a whole object sent as a string', () => {
      const response = { verdicts: [{ id: 'a' }], note: 'n' };

      expect(validate({ response: JSON.stringify(response) })[0].function.arguments).toEqual({
        response,
      });
    });

    it('parses a nested array sent as a string', () => {
      expect(
        validate({ response: { verdicts: JSON.stringify([{ id: 'a' }]) } })[0].function.arguments
      ).toEqual({ response: { verdicts: [{ id: 'a' }] } });
    });

    it('keeps a string that the schema expects as a string, even when it holds valid JSON', () => {
      // The outer `response` is a string, so validation fails and the repair runs. `note` is a
      // string the schema wants as a string, so it must come out of the repair unparsed: parsing
      // every string would turn it into an object and the second validation would fail.
      const response = { verdicts: [{ id: 'a' }], note: '{"a":1}' };

      expect(validate({ response: JSON.stringify(response) })[0].function.arguments).toEqual({
        response,
      });
    });

    it('still throws when the parsed value does not match the schema', () => {
      expect(() => validate({ response: JSON.stringify({ verdicts: [{ id: 1 }] }) })).toThrow(
        'were invalid'
      );
    });

    it('still throws when the string is not valid JSON', () => {
      expect(() => validate({ response: '{not json' })).toThrow('were invalid');
    });

    it('parses an array sent as a string inside an object sent as a string', () => {
      const response = JSON.stringify({ verdicts: JSON.stringify([{ id: 'a' }]) });

      expect(validate({ response })[0].function.arguments).toEqual({
        response: { verdicts: [{ id: 'a' }] },
      });
    });

    it('logs the repaired paths without the argument values', () => {
      validate({ response: JSON.stringify({ verdicts: JSON.stringify([{ id: 'secret-id' }]) }) });

      expect(logger.debug).toHaveBeenCalledTimes(1);
      const message = logger.debug.mock.calls[0][0]();
      expect(message).toBe(
        'Repaired JSON-encoded arguments of my_function (1) at: response, response.verdicts'
      );
      expect(message).not.toContain('secret-id');
    });

    it('does not log when the arguments are valid', () => {
      validate({ response: { verdicts: [{ id: 'a' }] } });

      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('when a repair runs next to a field that accepts a string or an object', () => {
    // The repair is in the shared inference path, so it must not change a value another tool
    // relies on: a string that validates as a string has to reach the tool as that string, even
    // when it holds JSON and the schema would also accept the parsed object.
    const tools = {
      my_function: {
        description: 'description',
        schema: asToolSchema({
          type: 'object',
          properties: {
            response: {
              type: 'object',
              properties: {
                verdicts: { type: 'array', items: { type: 'string' } },
                note: { type: ['string', 'object'] },
              },
              required: ['verdicts'],
            },
            label: { type: ['string', 'object'] },
          },
          required: ['response'],
        }),
      },
    };

    const validate = (args: unknown) =>
      validateToolCalls({
        logger,
        toolCalls: [
          { function: { name: 'my_function', arguments: JSON.stringify(args) }, toolCallId: '1' },
        ],
        tools,
      });

    it('keeps a valid sibling string unchanged', () => {
      const args = { response: JSON.stringify({ verdicts: ['a'] }), label: '{"a":1}' };

      expect(validate(args)[0].function.arguments).toEqual({
        response: { verdicts: ['a'] },
        label: '{"a":1}',
      });
    });

    it('keeps a string-or-object field inside the repaired value as a string', () => {
      const response = { verdicts: ['a'], note: '{"a":1}' };

      expect(validate({ response: JSON.stringify(response) })[0].function.arguments).toEqual({
        response,
      });
    });
  });

  it('does not repair a value whose schema is an anyOf (not supported)', () => {
    // Validation reports an anyOf mismatch as one union issue, not as an expected object, so the
    // repair leaves it alone and the call fails as it did before the repair existed.
    expect(() =>
      validateToolCalls({
        logger,
        toolCalls: [
          {
            function: {
              name: 'my_function',
              arguments: JSON.stringify({ response: JSON.stringify({ id: 'a' }) }),
            },
            toolCallId: '1',
          },
        ],
        tools: {
          my_function: {
            description: 'description',
            schema: asToolSchema({
              type: 'object',
              properties: {
                response: {
                  anyOf: [
                    { type: 'object', properties: { id: { type: 'string' } } },
                    { type: 'null' },
                  ],
                },
              },
              required: ['response'],
            }),
          },
        },
      })
    ).toThrow('were invalid');
  });
});
