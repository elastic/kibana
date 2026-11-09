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
  CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
  getSummaryFlyoutDefaultWidth,
} from './conversation_details_flyout_width';

describe('openConversationDetailsFlyout', () => {
  // The Summary opens wide inside the Agent Builder app, so that is where these tests run.
  beforeEach(() => {
    window.history.pushState({}, '', '/app/agent_builder/conversations/c1');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

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
      trailingActions,
    }: {
      onClose?: () => void;
      trailingActions?: EuiFlyoutMenuAction[];
    } = {}) =>
      openConversationDetailsFlyout({
        core,
        conversationsService: { get: jest.fn() } as unknown as ConversationsService,
        conversationTemplatesService,
        conversationId: 'conversation',
        onClose,
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
        title: 'Summary',
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

  it('opens resizable at two thirds of the page, up to nine tenths of it', async () => {
    const { core, open } = setup();

    await open();

    const [[, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options).toEqual(
      expect.objectContaining({
        size: Math.round((window.innerWidth * 2) / 3),
        defaultSize: Math.round((window.innerWidth * 2) / 3),
        minWidth: CONVERSATION_DETAILS_FLYOUT_MIN_WIDTH,
        maxWidth: Math.round(window.innerWidth * 0.9),
        resizable: true,
      })
    );
  });

  it('reopens at the width the user resized it to', async () => {
    const { core, open } = setup();

    await open();
    const [[, firstOptions]] = core.overlays.openSystemFlyout.mock.calls;
    firstOptions?.onResize?.(620);

    await open();

    const [, [, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options?.size).toBe(620);
    // A reset still returns to the default, not to the remembered width.
    expect(options?.defaultSize).toBe(getSummaryFlyoutDefaultWidth());
  });

  it('stays narrow outside the Agent Builder app', async () => {
    window.history.pushState({}, '', '/app/observability/landing');
    const { core, open } = setup();

    await open();

    const [[, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options?.defaultSize).toBeUndefined();
    expect(options?.size).toBe(480);
  });

  it('clamps a remembered width to the allowed range', async () => {
    const { core, open } = setup();

    await open();
    const [[, firstOptions]] = core.overlays.openSystemFlyout.mock.calls;
    firstOptions?.onResize?.(2000);

    await open();

    const [, [, options]] = core.overlays.openSystemFlyout.mock.calls;
    expect(options?.size).toBe(Math.round(window.innerWidth * 0.9));
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
