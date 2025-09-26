/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import type { AnonymizationRecord } from './types';
import { messageFromAnonymizationRecords } from './message_from_anonymization_records';

describe('messageFromAnonymizationRecords', () => {
  it('applies single leaf at /content for user string content', () => {
    const original: Message = {
      role: MessageRole.User,
      content: 'email a@example.com',
    };

    const record: AnonymizationRecord = {
      '/content': 'email EMAIL_12345',
    };

    const out = messageFromAnonymizationRecords(original, record);

    expect(out).toEqual({
      role: MessageRole.User,
      content: 'email EMAIL_12345',
    });
  });

  it('applies nested leaf under /content array items (index preserved)', () => {
    const original: Message = {
      role: MessageRole.User,
      content: [
        { type: 'text', text: 'first' },
        { type: 'text', text: 'a@example.com' },
        { type: 'text', text: 'third' },
      ],
    };

    const record: AnonymizationRecord = {
      '/content/1/text': 'EMAIL_12345',
    };

    const out = messageFromAnonymizationRecords(original, record);

    expect(out).toEqual({
      role: MessageRole.User,
      content: [
        { type: 'text', text: 'first' },
        { type: 'text', text: 'EMAIL_12345' },
        { type: 'text', text: 'third' },
      ],
    });
  });

  it('applies to tool response leaf and preserves other types', () => {
    const original: Message = {
      role: MessageRole.Tool,
      name: 'context',
      toolCallId: 't1',
      response: {
        msg: 'See http://example.com',
        n: 42,
        ok: true,
        nested: { note: 'contact me at a@example.com' },
      },
    };

    const record: AnonymizationRecord = {
      '/response/msg': 'See URL_12345',
      '/response/nested/note': 'contact me at EMAIL_12345',
    };

    const out = messageFromAnonymizationRecords(original, record);

    expect(out).toEqual({
      role: MessageRole.Tool,
      name: 'context',
      toolCallId: 't1',
      response: {
        msg: 'See URL_12345',
        n: 42,
        ok: true,
        nested: { note: 'contact me at EMAIL_12345' },
      },
    });
  });

  it('handles RFC-6901 escaped keys ("/" → "~1", "~" → "~0")', () => {
    const original: Message = {
      role: MessageRole.Tool,
      name: 'tool',
      toolCallId: 't2',
      response: {
        'a/b': 'x',
        'a~b': 'y',
        nested: { 'c/d~e': 'z' },
      },
    };

    const record: AnonymizationRecord = {
      '/response/a~1b': 'X',
      '/response/a~0b': 'Y',
      '/response/nested/c~1d~0e': 'Z',
    };

    const out = messageFromAnonymizationRecords(original, record);

    expect(out).toEqual({
      role: MessageRole.Tool,
      name: 'tool',
      toolCallId: 't2',
      response: {
        'a/b': 'X',
        'a~b': 'Y',
        nested: { 'c/d~e': 'Z' },
      },
    });
  });

  it('throws on invalid path under a primitive (property does not exist)', () => {
    const original: Message = {
      role: MessageRole.User,
      content: 'hello',
    };

    const record: AnonymizationRecord = {
      '/content': 'hi',
      '/content/missing': 'nope',
    };

    expect(() => messageFromAnonymizationRecords(original, record)).toThrow(
      'Invalid path at "/content/missing": expected object or array while traversing'
    );
  });

  it('refuses to create new properties on existing objects', () => {
    const original: Message = {
      role: MessageRole.User,
      content: [
        { type: 'text', text: 'first' },
        { type: 'text', text: 'second' },
      ],
    };

    const record: AnonymizationRecord = {
      '/content/1/other': 'X',
    };

    expect(() => messageFromAnonymizationRecords(original, record)).toThrow(
      'Invalid leaf at "/content/1/other": property does not exist'
    );
  });

  it('throws on array out-of-bounds at path segment', () => {
    const original: Message = {
      role: MessageRole.User,
      content: [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ],
    };

    const record: AnonymizationRecord = {
      '/content/2/text': 'X',
    };

    expect(() => messageFromAnonymizationRecords(original, record)).toThrow(
      'Invalid path segment "2" at "/content/2/text": array index out of bounds'
    );
  });

  it('throws when traversing into a non-object/array (primitive in path)', () => {
    const original: Message = {
      role: MessageRole.User,
      content: 'hello',
    };

    const record: AnonymizationRecord = {
      '/content/text': 'X',
    };

    expect(() => messageFromAnonymizationRecords(original, record)).toThrow(
      'Invalid path at "/content/text": expected object or array while traversing'
    );
  });

  it('throws when a parent object property is missing', () => {
    const original: Message = {
      role: MessageRole.Tool,
      name: 'ctx',
      toolCallId: 't1',
      response: {},
    };

    const record: AnonymizationRecord = {
      '/response/nested/msg': 'X',
    };

    expect(() => messageFromAnonymizationRecords(original, record)).toThrow(
      'Invalid path segment "nested" at "/response/nested/msg": missing property'
    );
  });

  it('requires pointers to start with "/"', () => {
    const original: Message = {
      role: MessageRole.User,
      content: 'hello',
    };

    const record: AnonymizationRecord = {
      content: 'hi',
    } as any;

    expect(() => messageFromAnonymizationRecords(original, record)).toThrow(
      'Invalid JSON Pointer: must start with "/". Got: "content"'
    );
  });
});
