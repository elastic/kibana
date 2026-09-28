/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { ConversationsService } from '../services/conversations/conversations_service';
import type { ConversationTemplatesService } from '../services/conversation_templates';
import { openConversationDetailsFlyout } from './open_conversation_details_flyout';

describe('openConversationDetailsFlyout', () => {
  const close = jest.fn();
  let resolveClosed: () => void;

  const openSystemFlyout = jest.fn(
    (): OverlayRef =>
      ({ close, onClose: new Promise<void>((resolve) => (resolveClosed = resolve)) } as OverlayRef)
  );

  const core = { overlays: { openSystemFlyout }, rendering: {} } as unknown as CoreStart;

  const open = (onClose?: () => void) =>
    openConversationDetailsFlyout({
      core,
      conversationsService: {} as ConversationsService,
      conversationTemplatesService: {} as ConversationTemplatesService,
      conversationId: 'conversation-1',
      onClose,
    });

  beforeEach(() => jest.clearAllMocks());

  it('opens a managed flyout, so content can open a flyout of its own on top of it', async () => {
    await open();

    expect(openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        session: 'start',
        // Shared with the flyouts opened from inside, which is what gives them a Back button here.
        historyKey: DOC_VIEWER_FLYOUT_HISTORY_KEY,
        // A managed flyout without one is registered as "Unknown Flyout", which is what a nested
        // flyout's Back button would then read.
        title: expect.any(String),
        type: 'push',
      })
    );
  });

  it('reports the flyout being dismissed to the caller', async () => {
    const onClose = jest.fn();
    await open(onClose);

    expect(onClose).not.toHaveBeenCalled();

    resolveClosed();
    await Promise.resolve();

    expect(onClose).toHaveBeenCalled();
  });

  it('returns a handle that closes the flyout', async () => {
    const dismiss = await open();

    dismiss();

    expect(close).toHaveBeenCalled();
  });
});
