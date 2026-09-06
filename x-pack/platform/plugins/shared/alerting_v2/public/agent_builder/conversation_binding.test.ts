/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldRestageOnConversationChange, type ConversationBinding } from './conversation_binding';

const unbound: ConversationBinding = { kind: 'unbound' };
const draft: ConversationBinding = { kind: 'bound', id: undefined };
const conv1: ConversationBinding = { kind: 'bound', id: 'conv-1' };
const conv2: ConversationBinding = { kind: 'bound', id: 'conv-2' };

describe('shouldRestageOnConversationChange', () => {
  it('restages when switching to a new conversation draft', () => {
    expect(shouldRestageOnConversationChange(conv1, draft)).toBe(true);
  });

  it('restages when switching to a different persisted conversation', () => {
    expect(shouldRestageOnConversationChange(conv1, conv2)).toBe(true);
  });

  it('does not restage when the conversation id is unchanged', () => {
    expect(shouldRestageOnConversationChange(conv1, conv1)).toBe(false);
    expect(shouldRestageOnConversationChange(draft, draft)).toBe(false);
  });

  it('does not restage when a draft is persisted', () => {
    expect(shouldRestageOnConversationChange(draft, conv1)).toBe(false);
  });

  it('does not restage when the sidebar opens or closes', () => {
    expect(shouldRestageOnConversationChange(unbound, draft)).toBe(false);
    expect(shouldRestageOnConversationChange(unbound, conv1)).toBe(false);
    expect(shouldRestageOnConversationChange(conv1, unbound)).toBe(false);
    expect(shouldRestageOnConversationChange(draft, unbound)).toBe(false);
  });
});
