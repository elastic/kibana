/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWriterClient } from '@kbn/agent-builder-server';
import type { ReadOnlyConversationClient } from '@kbn/agent-builder-server';

describe('Conversation writer client contract', () => {
  describe('ConversationWriterClient', () => {
    it('extends ReadOnlyConversationClient', () => {
      const readOnlyKeys: (keyof ReadOnlyConversationClient)[] = ['get', 'list'];
      const writerKeys: (keyof ConversationWriterClient)[] = [
        'get',
        'list',
        'create',
        'update',
        'delete',
      ];

      // Writer client has all read-only keys plus write keys
      expect(writerKeys).toEqual(expect.arrayContaining(readOnlyKeys));
      expect(writerKeys).toContain('create');
      expect(writerKeys).toContain('update');
      expect(writerKeys).toContain('delete');
    });
  });

  describe('type narrowing', () => {
    it('read-only client type does not include write methods', () => {
      // This is a compile-time guarantee. If ReadOnlyConversationClient
      // accidentally included write methods, this assignment would compile
      // when it should not. The type assertion below should fail at compile
      // time if write methods leak into ReadOnlyConversationClient.
      type ReadOnlyKeys = keyof ReadOnlyConversationClient;
      const keys: ReadOnlyKeys[] = ['get', 'list'];

      // Ensure 'create' is NOT assignable to ReadOnlyKeys
      // @ts-expect-error — 'create' should not exist on ReadOnlyConversationClient
      const _: ReadOnlyKeys = 'create';

      expect(keys).toEqual(['get', 'list']);
    });
  });
});
