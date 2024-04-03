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
import * as i18n from '../translations';
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
      data: [],
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

describe('ConnectorSelectorInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders empty view if no selected conversation is provided', () => {
    const { getByText } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={undefined}
          selectedConversation={undefined}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    expect(getByText(i18n.INLINE_CONNECTOR_PLACEHOLDER)).toBeInTheDocument();
  });

  it('renders empty view if selectedConnectorId is NOT in list of connectors', () => {
    const conversation: Conversation = {
      id: 'conversation_id',
      category: 'assistant',
      messages: [],
      apiConfig: { connectorId: '123' },
      replacements: {},
      title: 'conversation_id',
    };
    const { getByText } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={'missing-connector-id'}
          selectedConversation={conversation}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    expect(getByText(i18n.INLINE_CONNECTOR_PLACEHOLDER)).toBeInTheDocument();
  });
  it('Clicking add connector button opens the connector selector', () => {
    const conversation: Conversation = {
      id: 'conversation_id',
      category: 'assistant',
      messages: [],
      apiConfig: { connectorId: '123' },
      replacements: {},
      title: 'conversation_id',
    };
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={'missing-connector-id'}
          selectedConversation={conversation}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    expect(queryByTestId('connector-selector')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('connectorSelectorPlaceholderButton'));
    expect(getByTestId('connector-selector')).toBeInTheDocument();
  });
  it('On connector change, update conversation API config', () => {
    const connectorTwo = mockConnectors[1];
    const conversation: Conversation = {
      id: 'conversation_id',
      category: 'assistant',
      messages: [],
      apiConfig: { connectorId: '123' },
      replacements: {},
      title: 'conversation_id',
    };
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={'missing-connector-id'}
          selectedConversation={conversation}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connectorSelectorPlaceholderButton'));
    fireEvent.click(getByTestId('connector-selector'));
    fireEvent.click(getByTestId(connectorTwo.id));
    expect(queryByTestId('connector-selector')).not.toBeInTheDocument();
    expect(setApiConfig).toHaveBeenCalledWith({
      apiConfig: {
        connectorId: connectorTwo.id,
        model: undefined,
        provider: 'OpenAI',
      },
      conversation: {
        apiConfig: { connectorId: '123' },
        replacements: {},
        category: 'assistant',
        id: 'conversation_id',
        messages: [],
        title: 'conversation_id',
      },
    });
  });
  it('On connector change to add new connector, onchange event does nothing', () => {
    const conversation: Conversation = {
      id: 'conversation_id',
      category: 'assistant',
      messages: [],
      apiConfig: { connectorId: '123' },
      replacements: {},
      title: 'conversation_id',
    };
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          selectedConnectorId={'missing-connector-id'}
          selectedConversation={conversation}
          onConnectorSelected={jest.fn()}
        />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connectorSelectorPlaceholderButton'));
    fireEvent.click(getByTestId('connector-selector'));
    fireEvent.click(getByTestId('addNewConnectorButton'));
    expect(getByTestId('connector-selector')).toBeInTheDocument();
    expect(setApiConfig).not.toHaveBeenCalled();
  });
});
