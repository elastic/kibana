/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MessageRole } from '@kbn/inference-common';
import { createScriptedChatModel } from './scripted_chat_model';

describe('createScriptedChatModel', () => {
  it('answers a text response and records the request', async () => {
    const model = createScriptedChatModel();
    model.respond('hello');

    const response = await model.chatModel.invoke([
      ['system', 'be brief'],
      ['human', 'hi'],
    ]);

    expect(response.content).toBe('hello');
    expect(response.tool_calls).toEqual([]);
    expect(model.calls).toHaveLength(1);
    expect(model.calls[0]).toEqual(
      expect.objectContaining({
        system: 'be brief',
        messages: [{ role: MessageRole.User, content: 'hi' }],
      })
    );
    expect(model.calls[0].tools).toBeUndefined();
  });

  it('answers tool calls on a model with bound tools, sent in binding order', async () => {
    const model = createScriptedChatModel();
    model.respond({
      content: 'looking',
      toolCalls: [{ function: { name: 'search', arguments: { q: 'kibana' } } }],
    });

    const bound = model.chatModel.bindTools([
      { name: 'read', description: 'reads', schema: z.object({}) },
      { name: 'search', description: 'searches', schema: z.object({ q: z.string() }) },
    ]);
    const response = await bound.invoke([['human', 'find kibana']]);

    expect(response.content).toBe('looking');
    expect(response.tool_calls).toEqual([
      expect.objectContaining({ id: 'call-1-0', name: 'search', args: { q: 'kibana' } }),
    ]);
    expect(Object.keys(model.calls[0].tools ?? {})).toEqual(['read', 'search']);
    expect(model.calls[0].tools?.search.description).toBe('searches');
  });

  it('answers a structured output call with a call of the forced tool', async () => {
    const model = createScriptedChatModel();
    model.respond({ toolCalls: [{ function: { name: 'set_title', arguments: { title: 'A' } } }] });

    const structured = model.chatModel.withStructuredOutput(z.object({ title: z.string() }), {
      name: 'set_title',
    });
    const output = await structured.invoke([['human', 'title this']]);

    expect(output).toEqual({ title: 'A' });
    expect(Object.keys(model.calls[0].tools ?? {})).toEqual(['set_title']);
    expect(model.calls[0].toolChoice).toEqual({ function: 'set_title' });
  });

  it('streams a reply as one chunk, with its token count', async () => {
    const model = createScriptedChatModel();
    model.respond({
      toolCalls: [{ function: { name: 'search', arguments: { q: 'x' } } }],
      tokens: { prompt: 10, completion: 2, total: 12 },
    });

    const bound = model.chatModel.bindTools([
      { name: 'search', description: 'searches', schema: z.object({ q: z.string() }) },
    ]);
    const chunks = [];
    for await (const chunk of await bound.stream([['human', 'x']])) {
      chunks.push(chunk);
    }
    const message = chunks.reduce((whole, chunk) => whole.concat(chunk));

    expect(message.tool_calls).toEqual([
      expect.objectContaining({ name: 'search', args: { q: 'x' } }),
    ]);
    expect(message.usage_metadata).toEqual(
      expect.objectContaining({ input_tokens: 10, output_tokens: 2, total_tokens: 12 })
    );
  });

  it('fails the call with a scripted error, without retrying', async () => {
    const model = createScriptedChatModel();
    model.respond(new Error('boom'));

    await expect(model.chatModel.invoke([['human', 'hi']])).rejects.toThrow('boom');
    expect(model.calls).toHaveLength(1);
  });

  it('fails a call nothing was scripted for', async () => {
    const model = createScriptedChatModel();

    await expect(model.chatModel.invoke([['human', 'hi']])).rejects.toThrow(
      'no response scripted for call 1'
    );
  });
});
