/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatPromptGroups,
  getAllPromptIds,
  promptGroups,
  StarterPrompts,
} from './starter_prompts';
import { fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../mock/test_providers/test_providers';
import React from 'react';
import { useFindPrompts } from '../../..';
const mockResponse = [
  {
    promptId: 'starterPromptTitle1',
    prompt: 'starterPromptTitle1 from API yall',
  },
  {
    promptId: 'starterPromptDescription1',
    prompt: 'starterPromptDescription1 from API yall',
  },
  {
    promptId: 'starterPromptIcon1',
    prompt: 'starterPromptIcon1 from API yall',
  },
  {
    promptId: 'starterPromptPrompt1',
    prompt: 'starterPromptPrompt1 from API yall',
  },
  {
    promptId: 'starterPromptDescription2',
    prompt: 'starterPromptDescription2 from API yall',
  },
  {
    promptId: 'starterPromptTitle2',
    prompt: 'starterPromptTitle2 from API yall',
  },
  {
    promptId: 'starterPromptIcon2',
    prompt: 'starterPromptIcon2 from API yall',
  },
  {
    promptId: 'starterPromptPrompt2',
    prompt: 'starterPromptPrompt2 from API yall',
  },
  {
    promptId: 'starterPromptDescription3',
    prompt: 'starterPromptDescription3 from API yall',
  },
  {
    promptId: 'starterPromptTitle3',
    prompt: 'starterPromptTitle3 from API yall',
  },
  {
    promptId: 'starterPromptIcon3',
    prompt: 'starterPromptIcon3 from API yall',
  },
  {
    promptId: 'starterPromptPrompt3',
    prompt: 'starterPromptPrompt3 from API yall',
  },
  {
    promptId: 'starterPromptDescription4',
    prompt: 'starterPromptDescription4 from API yall',
  },
  {
    promptId: 'starterPromptTitle4',
    prompt: 'starterPromptTitle4 from API yall',
  },
  {
    promptId: 'starterPromptPrompt4',
    prompt: 'starterPromptPrompt4 from API yall',
  },
];

const testProps = {
  setUserPrompt: jest.fn(),
};
const mockReportAssistantStarterPrompt = jest.fn();
jest.mock('../../..', () => {
  return {
    useFindPrompts: jest.fn(),
    useAssistantContext: () => ({
      assistantAvailability: {
        isAssistantEnabled: true,
      },
      assistantTelemetry: {
        reportAssistantStarterPrompt: mockReportAssistantStarterPrompt,
      },
      http: { fetch: {} },
    }),
  };
});

describe('StarterPrompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return an empty array if no prompts are provided', () => {
    expect(getAllPromptIds(promptGroups)).toEqual([
      'starterPromptTitle1',
      'starterPromptDescription1',
      'starterPromptIcon1',
      'starterPromptPrompt1',
      'starterPromptDescription2',
      'starterPromptTitle2',
      'starterPromptIcon2',
      'starterPromptPrompt2',
      'starterPromptDescription3',
      'starterPromptTitle3',
      'starterPromptIcon3',
      'starterPromptPrompt3',
      'starterPromptDescription4',
      'starterPromptTitle4',
      'starterPromptIcon4',
      'starterPromptPrompt4',
    ]);
  });
  it('should return the correct prompt groups with fetched prompts', () => {
    const response = formatPromptGroups(mockResponse);
    expect(response).toEqual([
      {
        description: 'starterPromptDescription1 from API yall',
        icon: 'starterPromptIcon1 from API yall',
        prompt: 'starterPromptPrompt1 from API yall',
        title: 'starterPromptTitle1 from API yall',
      },
      {
        description: 'starterPromptDescription2 from API yall',
        icon: 'starterPromptIcon2 from API yall',
        prompt: 'starterPromptPrompt2 from API yall',
        title: 'starterPromptTitle2 from API yall',
      },
      {
        description: 'starterPromptDescription3 from API yall',
        icon: 'starterPromptIcon3 from API yall',
        prompt: 'starterPromptPrompt3 from API yall',
        title: 'starterPromptTitle3 from API yall',
      },
      // starterPrompt Group4 should not exist because starterPromptIcon4 is not in the mockResponse
    ]);
  });
  it('the component renders correctly with valid props', () => {
    (useFindPrompts as jest.Mock).mockReturnValue({ data: { prompts: mockResponse } });
    const { getByTestId } = render(
      <TestProviders>
        <StarterPrompts {...testProps} />
      </TestProviders>
    );
    expect(getByTestId('starterPromptPrompt2 from API yall')).toBeInTheDocument();
  });
  it('calls setUserPrompt when a prompt is selected', () => {
    (useFindPrompts as jest.Mock).mockReturnValue({ data: { prompts: mockResponse } });
    const { getByTestId } = render(
      <TestProviders>
        <StarterPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('starterPromptPrompt2 from API yall'));
    expect(testProps.setUserPrompt).toHaveBeenCalledWith('starterPromptPrompt2 from API yall');
  });
  it('calls reportAssistantStarterPrompt with prompt title when a prompt is selected', () => {
    (useFindPrompts as jest.Mock).mockReturnValue({ data: { prompts: mockResponse } });
    const { getByTestId } = render(
      <TestProviders>
        <StarterPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('starterPromptPrompt2 from API yall'));
    expect(mockReportAssistantStarterPrompt).toHaveBeenCalledWith({
      promptTitle: 'starterPromptTitle2 from API yall',
    });
  });
});
