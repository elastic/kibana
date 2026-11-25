/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationDisplayStatus, ConversationRoundStatus } from '@kbn/agent-builder-common';
import { deriveDisplayStatus } from './derive_display_status';

describe('deriveDisplayStatus', () => {
  it('marks a streaming chat as in progress', () => {
    expect(deriveDisplayStatus({ read: true }, true, false)).toBe(
      ConversationDisplayStatus.inProgress
    );
  });

  it('marks a chat waiting for input', () => {
    expect(
      deriveDisplayStatus({ status: ConversationRoundStatus.awaitingPrompt }, false, false)
    ).toBe(ConversationDisplayStatus.awaitingPrompt);
  });

  it('marks an unread chat that is not open', () => {
    expect(deriveDisplayStatus({ read: false }, false, false)).toBe(
      ConversationDisplayStatus.unread
    );
  });

  it('marks a read chat that is not open as read', () => {
    expect(deriveDisplayStatus({ read: true }, false, false)).toBe(ConversationDisplayStatus.read);
  });

  it('returns no status for the open chat', () => {
    expect(deriveDisplayStatus({ read: true }, false, true)).toBeUndefined();
  });
});
