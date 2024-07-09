/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { TestProviders } from '../../mock/test_providers/test_providers';
import { mockConnectors } from '../../mock/connectors';
import { ConnectorSelectorInline } from './connector_selector_inline';
import { Conversation } from '../../..';
import { useLoadConnectors } from '../use_load_connectors';

const setApiConfig = jest.fn();
const mockConversation = {
  setApiConfig,
};

jest.mock('../../assistant/use_conversation', () => ({
  useConversation: () => mockConversation,
}));
jest.mock('@kbn/triggers-actions-ui-plugin/public/common/constants', () => ({
  loadActionTypes: jest.fn(() => {
    return Promise.resolve([
      {
        id: '.gen-ai',
        name: 'Gen AI',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
      },
    ]);
  }),
}));

jest.mock('../use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => {
    return {
      data: mockConnectors,
      error: null,
      isSuccess: true,
    };
  }),
}));

(useLoadConnectors as jest.Mock).mockReturnValue({
  data: mockConnectors,
  error: null,
  isSuccess: true,
});

const defaultConvo: Conversation = {
  id: 'conversation_id',
  category: 'assistant',
  messages: [],
  apiConfig: { connectorId: '123', actionTypeId: '.gen-ai' },
  replacements: {},
  title: 'conversation_id',
};

describe('ConnectorSelectorInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders empty view if no selected conversation is provided', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={undefined}
          selectedConversation={undefined}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
  });

  it('renders empty view if selectedConnectorId is NOT in list of connectors', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={'missing-connector-id'}
          selectedConversation={defaultConvo}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
  });
  it('renders the connector selector', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={mockConnectors[0].id}
          selectedConversation={defaultConvo}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    expect(getByTestId('connector-selector')).toBeInTheDocument();
  });
  it('On connector change, update conversation API config', () => {
    const connectorTwo = mockConnectors[1];
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={mockConnectors[0].id}
          selectedConversation={defaultConvo}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    fireEvent.click(getByTestId(connectorTwo.id));
    expect(setApiConfig).toHaveBeenCalledWith({
      apiConfig: {
        actionTypeId: '.gen-ai',
        connectorId: connectorTwo.id,
        model: undefined,
        provider: 'OpenAI',
      },
      conversation: {
        apiConfig: { actionTypeId: '.gen-ai', connectorId: '123' },
        replacements: {},
        category: 'assistant',
        id: 'conversation_id',
        messages: [],
        title: 'conversation_id',
      },
    });
  });
  it('On connector change to add new connector, onchange event does nothing', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={mockConnectors[0].id}
          selectedConversation={defaultConvo}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    expect(getByTestId('connector-selector')).toBeInTheDocument();
    expect(setApiConfig).not.toHaveBeenCalled();
  });
});
