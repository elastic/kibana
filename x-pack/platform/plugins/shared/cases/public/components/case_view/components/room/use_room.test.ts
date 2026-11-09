/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTriggerMode, toRoomMessages } from './use_room';

describe('room', () => {
  it('reaches the agent only when it is on and mentioned', () => {
    expect(getTriggerMode('@Elastic AI Agent what changed?', true)).toBe('always');
    expect(getTriggerMode('@elastic ai agent what changed?', true)).toBe('always');
    expect(getTriggerMode('@Elastic AI Agent what changed?', false)).toBe('never');
    expect(getTriggerMode('isolating the host now', true)).toBe('never');
  });

  it("reads people's messages, the agent's replies, and its confirmation pauses", () => {
    const messages = toRoomMessages(
      [
        { id: 'c', type: 'conversation_created', created_at: 't0' },
        {
          id: 'e-1',
          type: 'user_message',
          created_at: 't1',
          actor: { username: 'priya', full_name: 'Priya Raman' },
          data: { message: 'Isolated it' },
        },
        {
          id: 'r-1::execution_terminated',
          type: 'execution_terminated',
          created_at: 't2',
          data: { outcome: { type: 'responded', response: { message: 'Done.' } } },
        },
        {
          id: 'r-2::execution_terminated',
          type: 'execution_terminated',
          created_at: 't3',
          data: { outcome: { type: 'prompt_requested' } },
        },
      ],
      'A teammate'
    );
    expect(messages).toEqual([
      { kind: 'person', id: 'e-1', text: 'Isolated it', author: 'Priya Raman', createdAt: 't1' },
      { kind: 'agent', id: 'r-1::execution_terminated', text: 'Done.', createdAt: 't2' },
      { kind: 'agentWaiting', id: 'r-2::execution_terminated', createdAt: 't3' },
    ]);
  });
});
