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
  isSettingsModalVisible: false,
  isClearable: true,
  onSystemPromptSelectionChange: jest.fn(),
  selectedPrompt: { id: 'default-system-prompt', content: '', name: '', promptType: 'system' },
  setIsSettingsModalVisible: jest.fn(),
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

  it('renders the prompt super select', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} />);

    expect(getByTestId(TEST_IDS.PROMPT_SUPERSELECT)).toBeInTheDocument();
  });

  it('renders the clear system prompt button', () => {
    const { getByTestId } = render(<SelectSystemPrompt {...props} />);

    expect(getByTestId('clearSystemPrompt')).toBeInTheDocument();
  });

  it('clears the selected system prompt when the clear button is clicked', async () => {
    const clearSelectedSystemPrompt = jest.fn();

    const { getByTestId } = render(
      <SelectSystemPrompt {...props} clearSelectedSystemPrompt={clearSelectedSystemPrompt} />
    );

    await userEvent.click(getByTestId('clearSystemPrompt'));

    expect(clearSelectedSystemPrompt).toHaveBeenCalledTimes(1);
  });
});
