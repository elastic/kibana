/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolChoiceType, isToolValidationError } from '@kbn/inference-common';
import { getRetryFilter } from '../../common/utils/error_retry_filter';
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
    // names. These cannot be attributed to a tool at all, so they are dropped
    // (and logged) rather than crashing the pipeline.
    const debug = jest.fn();
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
      logger: { debug },
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
    expect(debug).toHaveBeenCalledTimes(1);
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

  it('throws a ToolValidationError for unparseable JSON arguments', () => {
    // Malformed arguments must stay a `ToolValidationError`: `error_retry_filter`
    // classifies it as recoverable (so the completion is retried) and the
    // structured-output path re-prompts the model with the failure. Dropping the
    // call instead leaves both self-correction paths with nothing to act on.
    expect(() =>
      validateToolCalls({
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

  it('throws a ToolValidationError for schema-invalid arguments', () => {
    expect(() =>
      validateToolCalls({
        toolCalls: [
          {
            // Invalid: missing required `bar` field
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
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Tool call arguments for my_function (1) were invalid"`);
  });

  it('reports malformed arguments as a retryable ToolValidationError', () => {
    let thrown: unknown;
    try {
      validateToolCalls({
        toolCalls: [
          {
            function: {
              name: 'my_function',
              arguments: '{[]}',
            },
            toolCallId: '1',
          },
        ],
        tools: { my_function: { description: 'description' } },
      });
    } catch (error) {
      thrown = error;
    }

    expect(isToolValidationError(thrown)).toBe(true);
    expect(getRetryFilter('auto')(thrown as Error)).toBe(true);
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
