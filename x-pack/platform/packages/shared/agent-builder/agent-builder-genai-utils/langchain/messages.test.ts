/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolMessage } from '@langchain/core/messages';

import { extractToolReturn } from './messages';

const createMessage = (artifact: unknown, content: string = ''): ToolMessage => {
  return {
    content,
    artifact,
  } as ToolMessage;
};

describe('extractToolReturn', () => {
  it('should return the artifact as RunToolReturn when it contains valid results', () => {
    const message = createMessage({
      results: [{ key: 'value' }],
    });

    const result = extractToolReturn(message);
    expect(result).toEqual(message.artifact);
  });

  it('should throw an error if the message does not contain an artifact and is not an error message', () => {
    const mockMessage = createMessage(undefined);

    expect(() => extractToolReturn(mockMessage)).toThrowError(
      'No artifact attached to tool message'
    );
  });

  it('should return an error artifact if the message does not contain an artifact and is an error message', () => {
    const mockMessage = createMessage(undefined, 'Error: foo');
    const result = extractToolReturn(mockMessage);
    expect(result).toEqual({
      results: [
        {
          tool_result_id: expect.any(String),
          type: 'error',
          data: {
            message: 'Error: foo',
          },
        },
      ],
    });
  });

  it('should throw an error if the artifact does not have an array of results', () => {
    const mockMessage = createMessage({
      results: 'not-an-array',
    });

    expect(() => extractToolReturn(mockMessage)).toThrowError(
      'Artifact is not a structured tool artifact. Received artifact={"results":"not-an-array"}'
    );
  });

  it('should handle an empty results array correctly', () => {
    const mockMessage = createMessage({
      results: [],
    });

    const result = extractToolReturn(mockMessage);
    expect(result).toEqual(mockMessage.artifact);
  });
});
