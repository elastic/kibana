/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { QuickPrompts } from './quick_prompts';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';

const setInput = jest.fn();
const setIsSettingsModalVisible = jest.fn();
const trackPrompt = jest.fn();
const testProps = {
  setInput,
  setIsSettingsModalVisible,
  trackPrompt,
};

const mockUseAssistantContext = {
  setSelectedSettingsTab: jest.fn(),
  promptContexts: {},
  allQuickPrompts: MOCK_QUICK_PROMPTS,
};

const testTitle = 'SPL_QUERY_CONVERSION_TITLE';
const testPrompt = 'SPL_QUERY_CONVERSION_PROMPT';

jest.mock('../../assistant_context', () => ({
  ...jest.requireActual('../../assistant_context'),
  useAssistantContext: () => mockUseAssistantContext,
}));
// wip
describe.skip('QuickPrompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('setInput function is called with a string', () => {
    const { getByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByText(testTitle));
    expect(setInput).toHaveBeenCalledWith(testPrompt);
  });

  it('setIsSettingsModalVisible function is called with a boolean', () => {
    const { getByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByText('Add Quick Prompt'));
    expect(setIsSettingsModalVisible).toHaveBeenCalledWith(true);
  });

  it('trackPrompt function is called with a string', () => {
    const { getByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByText(testTitle));
    expect(trackPrompt).toHaveBeenCalledWith(testPrompt);
  });

  it('component renders correctly when allQuickPrompts is an empty array', () => {
    const { queryByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    expect(queryByText(testTitle)).toBeNull();
  });

  it('component renders correctly when promptContexts is an empty object', () => {
    const { queryByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    expect(queryByText(testTitle)).toBeNull();
  });

  it('component renders correctly when allQuickPrompts contains a quick prompt with no categories', () => {
    const allQuickPrompts = [{ title: testPrompt, prompt: testPrompt, color: 'primary' }];
    const { getByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} allQuickPrompts={allQuickPrompts} />
      </TestProviders>
    );
    fireEvent.click(getByText(testTitle));
    expect(setInput).toHaveBeenCalledWith(testPrompt);
  });
});
