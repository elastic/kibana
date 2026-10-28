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
import {
  CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH,
  CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH,
  CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
} from './conversation_details_flyout_width';

describe('openConversationDetailsFlyout', () => {
  const setup = () => {
    localStorage.clear();
    const core = coreMock.createStart();
    const conversationTemplatesService = new ConversationTemplatesService();
    const close = jest.fn();
    let resolveClosed: () => void = () => {};
    const onClosed = new Promise<void>((resolve) => {
      resolveClosed = resolve;
    });
    core.overlays.openSystemFlyout.mockReturnValue({ close, onClose: onClosed });

    const open = ({
      onClose,
      templateId,
      trailingActions,
    }: {
      onClose?: () => void;
      templateId?: string;
      trailingActions?: EuiFlyoutMenuAction[];
    } = {}) =>
      openConversationDetailsFlyout({
        core,
        conversationsService: { get: jest.fn() } as unknown as ConversationsService,
        conversationTemplatesService,
        conversationId: 'conversation',
        onClose,
        templateId,
        trailingActions,
      });

    return {
      core,
      close,
      open,
      conversationTemplatesService,
      closeFlyout: () => resolveClosed(),
    };
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

  it('opens resizable at the default width, within the shared min/max bounds', async () => {
    const { core, open } = setup();

    await open();

    const [[, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options).toEqual(
      expect.objectContaining({
        size: CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH,
        defaultSize: CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH,
        minWidth: CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
        maxWidth: CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH,
        resizable: true,
      })
    );
  });

  it("opens at the template's default width when the template defines one", async () => {
    const { core, open, conversationTemplatesService } = setup();
    conversationTemplatesService.registerTemplateUIDefinition('investigation', {
      name: 'Investigation',
      tabs: [],
      detailsFlyout: { defaultWidth: 600 },
    });

    await open({ templateId: 'investigation' });

    const [[, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options?.size).toBe(600);
    expect(options?.defaultSize).toBe(600);
  });

  it('reopens at the width the user resized this template to', async () => {
    const { core, open } = setup();

    await open({ templateId: 'investigation' });
    const [[, firstOptions]] = core.overlays.openSystemFlyout.mock.calls;
    firstOptions?.onResize?.(620);

    await open({ templateId: 'investigation' });
    await open({ templateId: 'escalation' });

    const [, [, sameTemplateOptions], [, otherTemplateOptions]] =
      core.overlays.openSystemFlyout.mock.calls;
    expect(sameTemplateOptions?.size).toBe(620);
    expect(otherTemplateOptions?.size).toBe(CONVERSATION_DETAILS_FLYOUT_DEFAULT_WIDTH);
  });

  it('clamps a remembered width to the allowed range', async () => {
    const { core, open } = setup();

    await open({ templateId: 'investigation' });
    const [[, firstOptions]] = core.overlays.openSystemFlyout.mock.calls;
    firstOptions?.onResize?.(2000);

    await open({ templateId: 'investigation' });

    const [, [, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options?.size).toBe(CONVERSATION_DETAILS_FLYOUT_MAX_WIDTH);
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
