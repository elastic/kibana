/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertConvo, conversationWithContentReferences } from '../../../mock/conversation';
import { Conversation } from '../../../..';
import { conversationContainsContentReferences, conversationContainsAnonymizedValues } from '.';

describe('conversation utils', () => {
  it.each([
    [undefined, false],
    [conversationWithContentReferences, true],
    [alertConvo, false],
  ])(
    'conversationContainsContentReferences',
    (conversation: Conversation | undefined, expected: boolean) => {
      expect(conversationContainsContentReferences(conversation)).toBe(expected);
    }
  );

  it.each([
    [undefined, false],
    [conversationWithContentReferences, false],
    [alertConvo, true],
  ])(
    'conversationContainsAnonymizedValues',
    (conversation: Conversation | undefined, expected: boolean) => {
      expect(conversationContainsAnonymizedValues(conversation)).toBe(expected);
    }
  );
});
