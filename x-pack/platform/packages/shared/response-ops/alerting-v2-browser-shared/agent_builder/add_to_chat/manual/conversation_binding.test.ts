/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import {
  toConversationBinding,
  shouldRestageOnConversationChange,
  type ConversationBinding,
} from './conversation_binding';

describe('toConversationBinding', () => {
  it('returns unbound when conversation is null', () => {
    expect(toConversationBinding(null)).toEqual({ kind: 'unbound' });
  });

  it('returns bound with undefined id for a new draft', () => {
    const conversation = { id: undefined } as ActiveConversation;
    expect(toConversationBinding(conversation)).toEqual({ kind: 'bound', id: undefined });
  });

  it('returns bound with the conversation id', () => {
    const conversation = { id: 'conv-1', conversation: undefined } as ActiveConversation;
    expect(toConversationBinding(conversation)).toEqual({ kind: 'bound', id: 'conv-1' });
  });
});

describe('shouldRestageOnConversationChange', () => {
  const unbound: ConversationBinding = { kind: 'unbound' };
  const draft: ConversationBinding = { kind: 'bound', id: undefined };
  const conv1: ConversationBinding = { kind: 'bound', id: 'conv-1' };
  const conv2: ConversationBinding = { kind: 'bound', id: 'conv-2' };

  it('returns false when next is unbound', () => {
    expect(shouldRestageOnConversationChange(conv1, unbound)).toBe(false);
  });

  it('returns false when previous is unbound', () => {
    expect(shouldRestageOnConversationChange(unbound, conv1)).toBe(false);
  });

  it('returns false when both are unbound', () => {
    expect(shouldRestageOnConversationChange(unbound, unbound)).toBe(false);
  });

  it('returns false when conversation id is unchanged', () => {
    expect(shouldRestageOnConversationChange(conv1, conv1)).toBe(false);
  });

  it('returns false when a draft is persisted (undefined → id)', () => {
    expect(shouldRestageOnConversationChange(draft, conv1)).toBe(false);
  });

  it('returns true when switching between different conversations', () => {
    expect(shouldRestageOnConversationChange(conv1, conv2)).toBe(true);
  });

  it('returns true when switching from a persisted conversation to a new draft', () => {
    expect(shouldRestageOnConversationChange(conv1, draft)).toBe(true);
  });
});
