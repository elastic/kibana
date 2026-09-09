/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ConversationWithoutRoundsWithPermissions } from '@kbn/agent-builder-common';
import type {
  ConversationTemplateUIContext,
  ConversationTemplateTabDefinition,
  ConversationTemplateUIDefinition,
} from '@kbn/agent-builder-browser';
import { agentBuilderMocks } from '../../mocks';
import { ConversationTemplatesService } from './conversation_templates_service';
import { createPublicConversationTemplatesContract } from './create_public_conversation_templates_contract';

const conversation = {
  id: 'conversation-a',
  agent_id: 'agent-a',
} as ConversationWithoutRoundsWithPermissions;

describe('createPublicConversationTemplatesContract', () => {
  const setup = () => {
    const context: ConversationTemplateUIContext = {
      attachmentsService: agentBuilderMocks.createStart().attachments,
      openSidebarConversation: jest.fn(),
      openFullscreenConversation: jest.fn().mockResolvedValue(undefined),
    };
    return {
      context,
      contract: createPublicConversationTemplatesContract({
        conversationTemplatesService: new ConversationTemplatesService(),
        context,
      }),
    };
  };

  it('stores definitions and preserves duplicate and missing-template behavior', () => {
    const { contract } = setup();
    const definition = { name: 'Investigation', tabs: [] };
    contract.registerTemplateUIDefinition('investigation', () => definition);
    expect(contract.getTemplateUIDefinition('investigation')).toBe(definition);
    expect(contract.getTemplateUIDefinition('missing')).toBeUndefined();
    expect(() =>
      contract.registerTemplateUIDefinition('investigation', () => definition)
    ).toThrow();
  });

  it('registers tabs without using context and preserves duplicate and missing-tab behavior', () => {
    const { contract } = setup();
    const definition = { label: 'Overview', content: () => null };
    contract.registerTab('overview', () => definition);
    expect(contract.getTab('overview')).toBe(definition);
    expect(contract.getTab('missing')).toBeUndefined();
    expect(() => contract.registerTab('overview', () => definition)).toThrow();
  });

  it('supplies the same context to tabs and templates without wrapping their components', () => {
    const { contract, context } = setup();
    const createTab = jest.fn(
      (capabilities: ConversationTemplateUIContext): ConversationTemplateTabDefinition => ({
        label: 'Overview',
        content: function TabContent({ conversation: tabConversation }) {
          const [clicked, setClicked] = useState(false);
          return (
            <>
              <button
                onClick={() => {
                  setClicked(true);
                  capabilities.openSidebarConversation(tabConversation.id);
                }}
              >
                {clicked ? 'Opened sidebar' : 'Open sidebar'}
              </button>
              <button
                onClick={() =>
                  capabilities.openFullscreenConversation({
                    conversationId: tabConversation.id,
                    agentId: tabConversation.agent_id,
                  })
                }
              >
                Open fullscreen
              </button>
            </>
          );
        },
      })
    );
    const createTemplate = jest.fn(() => ({ name: 'Investigation', tabs: ['overview'] }));
    contract.registerTab('overview', createTab);
    contract.registerTemplateUIDefinition('investigation', createTemplate);
    const TabContent = contract.getTab('overview')?.content;
    if (!TabContent) throw new Error('Expected a registered tab');
    const props = {
      conversation: { ...conversation, rounds: [] },
    };
    const { rerender } = render(<TabContent {...props} />);
    fireEvent.click(screen.getByText('Open sidebar'));
    fireEvent.click(screen.getByText('Open fullscreen'));
    rerender(<TabContent {...props} conversation={{ ...props.conversation, title: 'Updated' }} />);
    expect(screen.getByText('Opened sidebar')).toBeTruthy();
    expect(context.openSidebarConversation).toHaveBeenCalledWith(conversation.id);
    expect(context.openFullscreenConversation).toHaveBeenCalledWith({
      conversationId: conversation.id,
      agentId: conversation.agent_id,
    });
    expect(createTab).toHaveBeenCalledTimes(1);
    expect(createTab).toHaveBeenCalledWith(context);
    expect(createTemplate).toHaveBeenCalledWith(context);
    expect(TabContent).toBe(createTab.mock.results[0].value.content);
    expect(contract.getTab('overview')?.content).toBe(TabContent);
  });

  it('supplies navigation at registration and preserves the returned card and its hook state', () => {
    const { contract, context } = setup();
    const createDefinition = jest.fn(
      ({
        openSidebarConversation,
        openFullscreenConversation,
      }: ConversationTemplateUIContext): ConversationTemplateUIDefinition => ({
        name: 'Investigation',
        tabs: [],
        briefCard: function BriefCard({ conversation: cardConversation }) {
          const [clicked, setClicked] = useState(false);
          return (
            <>
              <button
                onClick={() => {
                  setClicked(true);
                  openSidebarConversation(cardConversation.id);
                }}
              >
                {clicked ? 'Opened sidebar' : 'Open sidebar'}
              </button>
              <button
                onClick={() =>
                  openFullscreenConversation({
                    conversationId: cardConversation.id,
                    agentId: cardConversation.agent_id,
                  })
                }
              >
                Open fullscreen
              </button>
            </>
          );
        },
      })
    );
    contract.registerTemplateUIDefinition('investigation', createDefinition);
    const BriefCard = contract.getTemplateUIDefinition('investigation')?.briefCard;
    if (!BriefCard) throw new Error('Expected a registered brief card');
    const { rerender } = render(<BriefCard conversation={conversation} />);
    fireEvent.click(screen.getByText('Open sidebar'));
    fireEvent.click(screen.getByText('Open fullscreen'));
    rerender(<BriefCard conversation={conversation} />);
    expect(screen.getByText('Opened sidebar')).toBeTruthy();
    expect(context.openSidebarConversation).toHaveBeenCalledWith(conversation.id);
    expect(context.openFullscreenConversation).toHaveBeenCalledWith({
      conversationId: conversation.id,
      agentId: conversation.agent_id,
    });
    expect(createDefinition).toHaveBeenCalledTimes(1);
    expect(createDefinition).toHaveBeenCalledWith(context);
    expect(BriefCard).toBe(createDefinition.mock.results[0].value.briefCard);
    expect(contract.getTemplateUIDefinition('investigation')?.briefCard).toBe(BriefCard);
  });
});
