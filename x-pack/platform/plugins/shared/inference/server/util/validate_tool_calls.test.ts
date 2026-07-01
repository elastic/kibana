/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolChoiceType } from '@kbn/inference-common';
import { validateToolCalls } from './validate_tool_calls';

describe('validateToolCalls', () => {
  it('throws an error if tools were called but toolChoice == none', () => {
    expect(() => {
      validateToolCalls({
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

  it('filters out malformed tool calls with empty names instead of throwing', () => {
    // Models under token pressure occasionally emit tool calls with empty
    // names. These should be silently dropped, not crash the pipeline.
    const result = validateToolCalls({
      toolCalls: [
        {
          function: {
            name: '',
            arguments: '{}',
          },
          toolCallId: '1',
        },
        {
          function: {
            name: 'my_function',
            arguments: '{}',
          },
          toolCallId: '2',
        },
      ],
      tools: {
        my_function: {
          description: 'description',
        },
      },
    });
    expect(result).toEqual([
      {
        function: {
          name: 'my_function',
          arguments: {},
        },
        toolCallId: '2',
      },
    ]);
  });

  it('throws an error if an unknown tool was called', () => {
    expect(() =>
      validateToolCalls({
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

  it('filters out tool calls with unparseable JSON arguments instead of throwing', () => {
    // Models under token pressure occasionally emit tool calls whose arguments
    // are not valid JSON. These should be silently dropped (giving the model a
    // chance to re-emit on the next turn), not crash the converse request.
    const result = validateToolCalls({
      toolCalls: [
        {
          function: {
            name: 'my_function',
            arguments: '{[]}',
          },
          toolCallId: '1',
        },
        {
          function: {
            name: 'my_function',
            arguments: '{}',
          },
          toolCallId: '2',
        },
      ],

      tools: {
        my_function: {
          description: 'description',
        },
      },
    });
    expect(result).toEqual([
      {
        function: {
          name: 'my_function',
          arguments: {},
        },
        toolCallId: '2',
      },
    ]);
  });

  it('filters out tool calls with schema-invalid arguments instead of throwing', () => {
    // Models occasionally emit JSON arguments that parse but fail the tool's
    // Zod schema (wrong types, missing required fields). Drop these rather
    // than 500-ing — the model self-corrects on the next turn.
    const result = validateToolCalls({
      toolCalls: [
        {
          // Invalid: missing required `bar` field
          function: {
            name: 'my_function',
            arguments: JSON.stringify({ foo: 'bar' }),
          },
          toolCallId: '1',
        },
        {
          // Valid
          function: {
            name: 'my_function',
            arguments: JSON.stringify({ bar: 'baz' }),
          },
          toolCallId: '2',
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
    expect(result).toEqual([
      {
        function: {
          name: 'my_function',
          arguments: { bar: 'baz' },
        },
        toolCallId: '2',
      },
    ]);
  });

  it('successfully validates and parses a valid tool call', () => {
    function runValidation() {
      return validateToolCalls({
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
    expect(() => runValidation()).not.toThrowError();

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
});
