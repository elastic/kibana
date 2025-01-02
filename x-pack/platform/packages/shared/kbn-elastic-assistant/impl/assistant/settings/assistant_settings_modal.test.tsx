/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';

import { AssistantSettingsModal } from './assistant_settings_modal';
import { welcomeConvo } from '../../mock/conversation';

const setIsSettingsModalVisible = jest.fn();
const onConversationSelected = jest.fn();

const testProps = {
  defaultConnectorId: '123',
  defaultProvider: OpenAiProviderType.OpenAi,
  isSettingsModalVisible: false,
  selectedConversation: welcomeConvo,
  setIsSettingsModalVisible,
  onConversationSelected,
  conversations: {},
  conversationsLoaded: true,
  refetchCurrentUserConversations: jest.fn(),
  anonymizationFields: { total: 0, page: 1, perPage: 1000, data: [] },
  refetchAnonymizationFieldsResults: jest.fn(),
};
const setSelectedSettingsTab = jest.fn();
const mockUseAssistantContext = {
  setSelectedSettingsTab,
  assistantFeatures: {},
};
jest.mock('../../assistant_context', () => {
  const original = jest.requireActual('../../assistant_context');

  return {
    ...original,
    useAssistantContext: () => mockUseAssistantContext,
  };
});

jest.mock('./assistant_settings', () => ({
  ...jest.requireActual('./assistant_settings'),
  // @ts-ignore
  AssistantSettings: ({ onClose, onSave }) => (
    <>
      <button type="button" data-test-subj="on-close" onClick={onClose} />
      <button type="button" data-test-subj="on-save" onClick={onSave} />
    </>
  ),
}));

describe('AssistantSettingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
