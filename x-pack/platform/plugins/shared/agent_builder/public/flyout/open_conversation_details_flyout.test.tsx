/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutMenuAction } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import type { ConversationsService } from '../services/conversations/conversations_service';
import { ConversationTemplatesService } from '../services/conversation_templates';
import { openConversationDetailsFlyout } from './open_conversation_details_flyout';

describe('openConversationDetailsFlyout', () => {
  const open = (menuActions?: EuiFlyoutMenuAction[]) => {
    const core = coreMock.createStart();
    core.overlays.openFlyout.mockReturnValue({ close: jest.fn(), onClose: new Promise(() => {}) });

    void openConversationDetailsFlyout({
      core,
      conversationsService: { get: jest.fn() } as unknown as ConversationsService,
      conversationTemplatesService: new ConversationTemplatesService(),
      conversationId: 'conversation',
      menuActions,
    });

    const [[, options]] = core.overlays.openFlyout.mock.calls;
    return options;
  };

  it('renders the caller menu actions in the flyout menu bar', () => {
    const copyLink: EuiFlyoutMenuAction = {
      iconType: 'link',
      'aria-label': 'Copy link',
      onClick: jest.fn(),
    };

    expect(open([copyLink])?.flyoutMenuProps).toEqual({ trailingActions: [copyLink] });
  });

  it('renders no menu actions by default', () => {
    expect(open()?.flyoutMenuProps?.trailingActions).toBeUndefined();
  });
});
