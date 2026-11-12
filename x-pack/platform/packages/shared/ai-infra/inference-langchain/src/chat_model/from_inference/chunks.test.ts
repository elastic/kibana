/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionChunkEvent } from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import { completionChunkToLangchain } from './chunks';

const toolCallChunk = (
  toolCallId: string,
  name: string,
  args: string
): ChatCompletionChunkEvent => ({
  type: ChatCompletionEventType.ChatCompletionChunk,
  content: '',
  tool_calls: [{ index: 0, toolCallId, function: { name, arguments: args } }],
});

describe('completionChunkToLangchain', () => {
  it('keeps the id of the first tool call chunk on the message built from all its chunks', () => {
    const message = [
      toolCallChunk('generated_tool_call_0', 'myFunction', '{"foo":'),
      toolCallChunk('', '', '"bar"}'),
    ]
      .map(completionChunkToLangchain)
      .reduce((acc, chunk) => acc.concat(chunk));

    expect(message.tool_calls).toEqual([
      { id: 'generated_tool_call_0', name: 'myFunction', args: { foo: 'bar' }, type: 'tool_call' },
    ]);
  });
});
