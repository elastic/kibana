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
  ConversationTemplateUIDefinition,
} from '@kbn/agent-builder-browser';
import { ConversationTemplatesService } from './conversation_templates_service';
import { createPublicConversationTemplatesContract } from './create_public_conversation_templates_contract';

const conversation = {
  id: 'conversation-a',
  agent_id: 'agent-a',
} as ConversationWithoutRoundsWithPermissions;

describe('createPublicConversationTemplatesContract', () => {
  const setup = () => {
    const context: ConversationTemplateUIContext = {
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
