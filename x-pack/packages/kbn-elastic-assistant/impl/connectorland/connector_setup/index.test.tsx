/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { welcomeConvo } from '../../mock/conversation';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { ConnectorSetup } from '.';

const onConversationUpdate = jest.fn();

const defaultProps = {
  conversation: welcomeConvo,
  onConversationUpdate,
};
const newConnector = { actionTypeId: '.gen-ai', name: 'cool name' };
jest.mock('../add_connector_modal', () => ({
  // @ts-ignore
  AddConnectorModal: ({ onSaveConnector }) => (
    <>
      <button
        type="button"
        data-test-subj="modal-mock"
        onClick={() => onSaveConnector(newConnector)}
      />
    </>
  ),
}));

const setApiConfig = jest.fn().mockResolvedValue(welcomeConvo);
const mockConversation = {
  appendMessage: jest.fn(),
  appendReplacements: jest.fn(),
  clearConversation: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
  setApiConfig,
};

jest.mock('../../assistant/use_conversation', () => ({
  useConversation: () => mockConversation,
}));

jest.spyOn(global, 'clearTimeout');
describe('ConnectorSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render action type selector', async () => {
    const { getByTestId } = render(<ConnectorSetup {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('modal-mock')).toBeInTheDocument();
  });

  it('should set api config for each conversation when new connector is saved', async () => {
    const { getByTestId } = render(<ConnectorSetup {...defaultProps} />, {
      wrapper: TestProviders,
    });

    fireEvent.click(getByTestId('modal-mock'));
    expect(setApiConfig).toHaveBeenCalledTimes(1);
  });

  it('should NOT set the api config for each conversation when a new connector is saved and updateConversationsOnSaveConnector is false', async () => {
    const { getByTestId } = render(
      <ConnectorSetup
        {...defaultProps}
        updateConversationsOnSaveConnector={false} // <-- don't update the conversations
      />,
      {
        wrapper: TestProviders,
      }
    );

    fireEvent.click(getByTestId('modal-mock'));

    expect(setApiConfig).not.toHaveBeenCalled();
  });
});
