/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Props, SelectSystemPrompt } from '.';
import { TEST_IDS } from '../../../constants';
import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import { HttpSetup } from '@kbn/core/public';
import { useFetchPrompts } from '../../../api';
import { mockSystemPrompts } from '../../../../mock/system_prompt';
import { DefinedUseQueryResult } from '@tanstack/react-query';

jest.mock('../../../api/prompts/use_fetch_prompts');
const http = {
  fetch: jest.fn().mockResolvedValue(defaultAssistantFeatures),
} as unknown as HttpSetup;

jest.mocked(useFetchPrompts).mockReturnValue({
  data: { page: 1, perPage: 1000, data: mockSystemPrompts, total: 10 },
  isLoading: false,
  refetch: jest.fn().mockResolvedValue({
    isLoading: false,
    data: {
      ...mockSystemPrompts,
    },
  }),
  isFetched: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as unknown as DefinedUseQueryResult<any, unknown>);

const props: Props = {
  allPrompts: [
    {
      id: 'default-system-prompt',
      content: 'default',
      name: 'default',
      promptType: 'system',
      isDefault: true,
      isNewConversationDefault: true,
    },
  ],
  conversation: undefined,
  isSettingsModalVisible: false,
  selectedPrompt: { id: 'default-system-prompt', content: '', name: '', promptType: 'system' },
  setIsSettingsModalVisible: jest.fn(),
  isFlyoutMode: false,
};

const mockUseAssistantContext = {
  http,
  assistantAvailability: { isAssistantEnabled: true },
  allSystemPrompts: [
    {
      id: 'default-system-prompt',
      content: 'default',
      name: 'default',
      promptType: 'system',
      isDefault: true,
      isNewConversationDefault: true,
    },
    {
      id: 'CB9FA555-B59F-4F71-AFF9-8A891AC5BC28',
      content: 'superhero',
      name: 'superhero',
      promptType: 'system',
      isDefault: true,
    },
  ],
  setAllSystemPrompts: jest.fn(),
  knowledgeBase: {
    isEnabledRAGAlerts: false,
    isEnabledKnowledgeBase: false,
  },
};
jest.mock('../../../../assistant_context', () => {
  const original = jest.requireActual('../../../../assistant_context');

  return {
    ...original,
    useAssistantContext: () => mockUseAssistantContext,
  };
});

describe('SelectSystemPrompt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the prompt super select when isEditing is true', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} isEditing={true} />);

    expect(getByTestId(TEST_IDS.PROMPT_SUPERSELECT)).toBeInTheDocument();
  });

  it('does NOT render the prompt super select when isEditing is false', () => {
    const { queryByTestId } = render(<SelectSystemPrompt {...props} isEditing={false} />);

    expect(queryByTestId(TEST_IDS.PROMPT_SUPERSELECT)).not.toBeInTheDocument();
  });

  it('does NOT render the clear system prompt button when isEditing is true', () => {
    const { queryByTestId } = render(<SelectSystemPrompt {...props} isEditing={true} />);

    expect(queryByTestId('clearSystemPrompt')).not.toBeInTheDocument();
  });

  it('renders the clear system prompt button when isEditing is true AND isClearable is true', () => {
    const { getByTestId } = render(
      <SelectSystemPrompt {...props} isClearable={true} isEditing={true} />
    );

    expect(getByTestId('clearSystemPrompt')).toBeInTheDocument();
  });

  it('does NOT render the clear system prompt button when isEditing is false', () => {
    const { queryByTestId } = render(<SelectSystemPrompt {...props} isEditing={false} />);

    expect(queryByTestId('clearSystemPrompt')).not.toBeInTheDocument();
  });

  it('renders the add system prompt button when isEditing is false', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} isEditing={false} />);

    expect(getByTestId('addSystemPrompt')).toBeInTheDocument();
  });

  it('does NOT render the add system prompt button when isEditing is true', () => {
    const { queryByTestId } = render(<SelectSystemPrompt {...props} isEditing={true} />);

    expect(queryByTestId('addSystemPrompt')).not.toBeInTheDocument();
  });

  it('clears the selected system prompt when the clear button is clicked', () => {
    const clearSelectedSystemPrompt = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt
        {...props}
        clearSelectedSystemPrompt={clearSelectedSystemPrompt}
        isEditing={true}
        isClearable={true}
      />
    );

    userEvent.click(getByTestId('clearSystemPrompt'));

    expect(clearSelectedSystemPrompt).toHaveBeenCalledTimes(1);
  });

  it('hides the select when the clear button is clicked', () => {
    const setIsEditing = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt
        {...props}
        setIsEditing={setIsEditing}
        isEditing={true}
        isClearable={true}
      />
    );

    userEvent.click(getByTestId('clearSystemPrompt'));

    expect(setIsEditing).toHaveBeenCalledWith(false);
  });

  it('shows the select when the add button is clicked', () => {
    const setIsEditing = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt {...props} setIsEditing={setIsEditing} isEditing={false} />
    );

    userEvent.click(getByTestId('addSystemPrompt'));

    expect(setIsEditing).toHaveBeenCalledWith(true);
  });
});
