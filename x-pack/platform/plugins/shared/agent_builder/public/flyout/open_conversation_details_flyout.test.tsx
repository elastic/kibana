/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutMenuAction } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY } from '@kbn/agent-builder-browser';
import type { ConversationsService } from '../services/conversations/conversations_service';
import { ConversationTemplatesService } from '../services/conversation_templates';
import { openConversationDetailsFlyout } from './open_conversation_details_flyout';

describe('openConversationDetailsFlyout', () => {
  const setup = () => {
    const core = coreMock.createStart();
    const close = jest.fn();
    let resolveClosed: () => void = () => {};
    const onClosed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    core.overlays.openSystemFlyout.mockReturnValue({ close, onClose: onClosed });

    const open = ({
      onClose,
      trailingActions,
    }: { onClose?: () => void; trailingActions?: EuiFlyoutMenuAction[] } = {}) =>
      openConversationDetailsFlyout({
        core,
        conversationsService: { get: jest.fn() } as unknown as ConversationsService,
        conversationTemplatesService: new ConversationTemplatesService(),
        conversationId: 'conversation',
        onClose,
        trailingActions,
      });

    return { core, close, open, closeFlyout: () => resolveClosed() };
  };

  it('opens a managed flyout in the conversation details history group', async () => {
    const { core, open } = setup();

    await open();

    expect(core.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        session: 'start',
        historyKey: CONVERSATION_DETAILS_FLYOUT_HISTORY_KEY,
        title: 'Chat info',
        type: 'push',
      })
    );
  });

  it('renders the caller menu actions in the flyout menu bar', async () => {
    const { core, open } = setup();
    const copyLink: EuiFlyoutMenuAction = {
      iconType: 'link',
      'aria-label': 'Copy link',
      onClick: jest.fn(),
    };

    await open({ trailingActions: [copyLink] });

    expect(core.overlays.openSystemFlyout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ flyoutMenuProps: { trailingActions: [copyLink] } })
    );
  });

  it('renders no menu actions by default', async () => {
    const { core, open } = setup();

    await open();

    const [[, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options?.flyoutMenuProps?.trailingActions).toBeUndefined();
  });

  it('notifies the caller once the flyout closes', async () => {
    const { open, closeFlyout } = setup();
    const onClose = jest.fn();

    await open({ onClose });
    await Promise.resolve();

    expect(onClose).not.toHaveBeenCalled();

    closeFlyout();
    await Promise.resolve();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns a handle that closes the flyout', async () => {
    const { close, open } = setup();

    const dismiss = await open();
    dismiss();

    expect(close).toHaveBeenCalledTimes(1);
  });
});
