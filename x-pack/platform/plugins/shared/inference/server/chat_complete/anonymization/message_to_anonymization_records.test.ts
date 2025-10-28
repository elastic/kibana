/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { messageToAnonymizationRecords } from './message_to_anonymization_records';

describe('messageToAnonymizationRecords', () => {
  it('User message string content becomes /content', () => {
    const msg: Message = {
      role: MessageRole.User,
      content: 'email a@example.com',
    };

    const rec = messageToAnonymizationRecords(msg);

    expect(rec).toEqual({
      '/content': 'email a@example.com',
    });
  });

  it('User message array/object content flattens to leaf strings', () => {
    const msg: Message = {
      role: MessageRole.User,
      content: [
        { type: 'text', text: 'a@example.com' },
        { type: 'text', text: 'ok' },
      ],
    };

    const rec = messageToAnonymizationRecords(msg);

    expect(rec).toEqual({
      '/content/0/text': 'a@example.com',
      '/content/1/text': 'ok',
    });
  });

  it('Tool message only /response subtree is considered; non-strings ignored', () => {
    const msg: Message = {
      role: MessageRole.Tool,
      name: 'tool-1',
      toolCallId: 't1',
      response: { msg: 'a@example.com', n: 1, ok: true, nil: null },
    };

    const rec = messageToAnonymizationRecords(msg);

    expect(rec).toEqual({
      '/response/msg': 'a@example.com',
    });
  });

  it('Assistant message /content and /toolCalls/*/function/arguments', () => {
    const msg: Message = {
      role: MessageRole.Assistant,
      content: 'See results',
      toolCalls: [
        {
          id: 'call-1',
          type: 'function',
          function: {
            name: 'doThing',
            arguments: 'a@example.com',
          },
        } as any,
      ],
    };

    const rec = messageToAnonymizationRecords(msg);

    expect(rec).toEqual({
      '/content': 'See results',
      '/toolCalls/0/function/arguments': 'a@example.com',
      '/toolCalls/0/function/name': 'doThing',
    });
  });

  it('Escaping in keys — "/" → "~1", "~" → "~0"', () => {
    const msg: Message = {
      role: MessageRole.Tool,
      name: 'tool-1',
      toolCallId: 't1',
      response: {
        'a/b': 'x',
        'a~b': 'y',
        nested: { 'c/d~e': 'z' },
      },
    };

    const rec = messageToAnonymizationRecords(msg);

    expect(rec).toEqual({
      '/response/a~1b': 'x', // "a/b"
      '/response/a~0b': 'y', // "a~b"
      '/response/nested/c~1d~0e': 'z', // "c/d~e"
    });
  });

  it('Non-string leaves are ignored', () => {
    const msg: Message = {
      role: MessageRole.Tool,
      name: 'tool-1',
      toolCallId: 't1',
      response: {
        a: 1,
        b: false,
        c: null,
        d: ['x', 2, true, null],
      },
    };

    const rec = messageToAnonymizationRecords(msg);

    expect(rec).toEqual({
      '/response/d/0': 'x',
    });
  });

  it('User message with mixed text/image content only processes text', () => {
    const msg: Message = {
      role: MessageRole.User,
      content: [
        { type: 'text', text: 'a@example.com' },
        { type: 'image', source: { data: 'image data', mimeType: 'image/png' } },
        { type: 'text', text: 'ok' },
      ],
    };

    const rec = messageToAnonymizationRecords(msg);

    expect(rec).toEqual({
      '/content/0/text': 'a@example.com',
      '/content/2/text': 'ok',
    });
  });

  it('User message with image-only content yields an empty record', () => {
    const msg: Message = {
      role: MessageRole.User,
      content: [
        { type: 'image', source: { data: 'img1', mimeType: 'image/png' } },
        { type: 'image', source: { data: 'img2', mimeType: 'image/jpeg' } },
      ],
    };

    const rec = messageToAnonymizationRecords(msg);
    expect(rec).toEqual({});
  });
});
