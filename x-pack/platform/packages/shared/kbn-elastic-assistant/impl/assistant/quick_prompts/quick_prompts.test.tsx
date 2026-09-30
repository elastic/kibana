/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';
import { QUICK_PROMPTS_TAB } from '../settings/const';
import { QuickPrompts } from './quick_prompts';
import { of } from 'rxjs';

const setInput = vi.fn();
const setIsSettingsModalVisible = vi.fn();
const trackPrompt = vi.fn();
const testProps = {
  setInput,
  setIsSettingsModalVisible,
  trackPrompt,
  allPrompts: MOCK_QUICK_PROMPTS,
};
const setSelectedSettingsTab = vi.fn();
const mockUseAssistantContext = {
  setSelectedSettingsTab,
  promptContexts: {},
  allQuickPrompts: MOCK_QUICK_PROMPTS,
  chrome: {
    getChromeStyle$: vi.fn(() => of('classic')),
  },
  assistantAvailability: {
    hasAssistantPrivilege: true,
  },
};

const testTitle = 'SPL_QUERY_CONVERSION_TITLE';
const testPrompt = 'SPL_QUERY_CONVERSION_PROMPT';
const customTitle = 'A_CUSTOM_OPTION';

vi.mock('react-use/lib/useMeasure', () => ({
  default: () => [
    () => {},
    {
      width: 500,
    },
  ],
}));

vi.mock('../../assistant_context', async () => {
  const mocked = {
    ...(await vi.importActual('../../assistant_context')),
    useAssistantContext: () => mockUseAssistantContext,
  };
  return { ...mocked, default: mocked };
});

describe('QuickPrompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('onClickAddQuickPrompt calls setInput with the prompt, and trackPrompt with the prompt title', () => {
    const { getByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByText(testTitle));

    expect(setInput).toHaveBeenCalledWith(testPrompt);
    expect(trackPrompt).toHaveBeenCalledWith(testTitle);
  });
  it('onClickAddQuickPrompt calls trackPrompt with "Custom" when isDefault=false prompt is chosen', () => {
    const { getByText } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByText(customTitle));

    expect(trackPrompt).toHaveBeenCalledWith('Custom');
  });

  it('clicking "Add quick prompt" button opens the settings modal', () => {
    const { getByTestId } = render(
      <TestProviders>
        <QuickPrompts {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('addQuickPrompt'));
    expect(setIsSettingsModalVisible).toHaveBeenCalledWith(true);
    expect(setSelectedSettingsTab).toHaveBeenCalledWith(QUICK_PROMPTS_TAB);
  });
});
