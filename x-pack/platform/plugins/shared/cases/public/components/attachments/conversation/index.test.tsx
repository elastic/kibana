/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStartDependencies } from '../../../types';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { renderWithTestingProviders } from '../../../common/mock';
import { getConversationAttachmentType } from '.';
import type { ConversationViewProps } from './conversation_event';

describe('getConversationAttachmentType', () => {
  const type = getConversationAttachmentType();
  const openChat = jest.fn();
  const services = { agentBuilder: { openChat } } as unknown as CasesPublicStartDependencies;
  const coreStart = createStartServicesMock() as unknown as CoreStart;
  (coreStart.application.getUrlForApp as jest.Mock).mockImplementation(
    (appId: string, { path }: { path: string }) => `/app/${appId}${path}`
  );

  const viewProps = {
    attachmentId: 'conv-1',
    metadata: { title: 'Suspicious login', agentId: 'agent-1' },
    caseData: { id: 'case-1', title: 'Case' },
  } as unknown as ConversationViewProps;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers under the conversation type id with an authorable schema', () => {
    expect(type.id).toBe(AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE);
    expect(type.getLabel()).toBe('Conversations');
    expect(
      type.schema.safeParse({
        type: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
        owner: 'cases',
        attachmentId: 'conv-1',
      }).success
    ).toBe(true);
  });

  it('renders the creation event as a link that opens the conversation in chat', async () => {
    const activity = type.getCreationActivity(viewProps);
    renderWithTestingProviders(<>{activity.event}</>, { wrapperProps: { services, coreStart } });

    expect(screen.getByTestId('cases-conversation-event-conv-1')).toHaveTextContent(
      'added conversation Suspicious login'
    );
    expect(screen.getByTestId('cases-conversation-event-link-conv-1')).toHaveAttribute(
      'href',
      '/app/agent_builder/agents/agent-1/conversations/conv-1'
    );
    await userEvent.click(screen.getByTestId('cases-conversation-event-link-conv-1'));

    expect(openChat).toHaveBeenCalledWith({ conversationId: 'conv-1', agentId: 'agent-1' });
    expect(activity.deleteSuccessToast).toBe('Deleted conversation attachment');
  });

  it('falls back to an untitled label when the title is missing', () => {
    const activity = type.getCreationActivity({ ...viewProps, metadata: undefined });
    renderWithTestingProviders(<>{activity.event}</>, { wrapperProps: { services } });

    expect(screen.getByTestId('cases-conversation-event-conv-1')).toHaveTextContent(
      'added conversation Untitled conversation'
    );
  });

  it('describes removals and exposes an Attachments tab view', () => {
    expect(type.getRemovalActivity?.(viewProps)).toEqual({ event: 'removed conversation' });
    expect(type.getAttachmentList?.()).toHaveProperty('children');
  });
});
