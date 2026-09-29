/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { OpenAiProviderType } from '@kbn/connector-schemas/openai';

import { AssistantSettingsModal } from './assistant_settings_modal';
import { welcomeConvo } from '../../mock/conversation';

const setIsSettingsModalVisible = vi.fn();
const onConversationSelected = vi.fn();

const testProps = {
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
  isSettingsModalVisible: false,
  selectedConversation: welcomeConvo,
  setIsSettingsModalVisible,
  onConversationSelected,
  conversations: {},
  conversationsLoaded: true,
  refetchCurrentConversation: vi.fn(),
  refetchCurrentUserConversations: vi.fn(),
  anonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  refetchAnonymizationFieldsResults: vi.fn(),
  setPaginationObserver: vi.fn(),
};
const setSelectedSettingsTab = vi.fn();
const mockUseAssistantContext = {
  setSelectedSettingsTab,
  assistantFeatures: {},
};
vi.mock('../../assistant_context', async () => {
  const original = (await vi.importActual('../../assistant_context'));

  return {
    ...original,
    useAssistantContext: () => mockUseAssistantContext,
  };
});

vi.mock('./assistant_settings', async () => {
      const mocked = {
      ...(await vi.importActual('./assistant_settings')),
      // @ts-ignore
      AssistantSettings: ({ onClose, onSave }) => (
        <>
          <button type="button" data-test-subj="on-close" onClick={onClose} />
          <button type="button" data-test-subj="on-save" onClick={onSave} />
        </>
      ),
    };
      return { ...mocked, default: mocked };
    });

describe('AssistantSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Settings modal is visible and calls correct actions per click', () => {
    const { getByTestId } = render(
      <AssistantSettingsModal {...testProps} isSettingsModalVisible />
    );
    fireEvent.click(getByTestId('on-close'));
    expect(setIsSettingsModalVisible).toHaveBeenCalledWith(false);
    fireEvent.click(getByTestId('on-save'));
    expect(setIsSettingsModalVisible).toHaveBeenCalledTimes(2);
  });
});
