/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useConversation } from './use_conversation';
import { useConversationTemplateDisplay } from './use_conversation_template_display';

jest.mock('./use_conversation', () => ({
  useConversation: jest.fn(),
}));

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    conversationTemplatesService: {
      getTemplateUIDefinition: (id: string) =>
        id === 'investigation' ? { name: 'Investigation', icon: 'search' } : undefined,
    },
  }),
}));

const mockUseConversation = jest.mocked(useConversation);

const withTemplate = (templateId?: string) =>
  mockUseConversation.mockReturnValue({
    conversation: { template_id: templateId },
  } as unknown as ReturnType<typeof useConversation>);

describe('useConversationTemplateDisplay', () => {
  it('returns nothing for a chat without a template', () => {
    withTemplate(undefined);

    expect(renderHook(() => useConversationTemplateDisplay()).result.current).toBeUndefined();
  });

  it('uses the registered template name and icon', () => {
    withTemplate('investigation');

    expect(renderHook(() => useConversationTemplateDisplay()).result.current).toEqual({
      name: 'Investigation',
      icon: 'search',
    });
  });

  it('shows a readable template id when the template is not registered', () => {
    withTemplate('test_incident');

    expect(renderHook(() => useConversationTemplateDisplay()).result.current).toEqual({
      name: 'Test incident',
      icon: undefined,
    });
  });
});
