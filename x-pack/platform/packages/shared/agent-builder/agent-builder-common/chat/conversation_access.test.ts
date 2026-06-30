/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCollaborativeConversation } from './conversation_access';

describe('isCollaborativeConversation', () => {
  it('returns true for denormalized chat_mode', () => {
    expect(isCollaborativeConversation({ chat_mode: 'collaborative' })).toBe(true);
  });

  it('returns true for template snapshot chat_mode', () => {
    expect(
      isCollaborativeConversation({
        template_snapshot: { template_id: 'incident-triage-v2', captured_at: '', chat_mode: 'collaborative' },
      })
    ).toBe(true);
  });

  it('returns true for legacy conversation_mode group', () => {
    expect(isCollaborativeConversation({ conversation_mode: 'group' })).toBe(true);
  });

  it('returns false for single chat', () => {
    expect(
      isCollaborativeConversation({
        chat_mode: 'single',
        template_snapshot: { template_id: 'research-notes-v1', captured_at: '', chat_mode: 'single' },
      })
    ).toBe(false);
  });
});
