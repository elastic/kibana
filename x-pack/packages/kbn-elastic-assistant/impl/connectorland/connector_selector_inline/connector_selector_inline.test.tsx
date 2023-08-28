/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { noop } from 'lodash/fp';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { ConnectorSelectorInline } from './connector_selector_inline';
import * as i18n from '../translations';
import { Conversation } from '../../..';
import { useLoadConnectors } from '../use_load_connectors';

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

const mockConnectors = [
  {
    id: 'connectorId',
    name: 'Captain Connector',
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
    },
  },
];

(useLoadConnectors as jest.Mock).mockReturnValue({
  data: mockConnectors,
  error: null,
  isSuccess: true,
});

describe('ConnectorSelectorInline', () => {
  it('renders empty view if no selected conversation is provided', () => {
    const { getByText } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          onConnectorModalVisibilityChange={noop}
          onConnectorSelectionChange={noop}
          selectedConnectorId={undefined}
          selectedConversation={undefined}
        />
      </TestProviders>
    );
    expect(getByText(i18n.INLINE_CONNECTOR_PLACEHOLDER)).toBeInTheDocument();
  });

  it('renders empty view if selectedConnectorId is NOT in list of connectors', () => {
    const conversation: Conversation = {
      id: 'conversation_id',
      messages: [],
      apiConfig: {},
    };
    const { getByText } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          onConnectorModalVisibilityChange={noop}
          onConnectorSelectionChange={noop}
          selectedConnectorId={'missing-connector-id'}
          selectedConversation={conversation}
        />
      </TestProviders>
    );
    expect(getByText(i18n.INLINE_CONNECTOR_PLACEHOLDER)).toBeInTheDocument();
  });

  it('renders selected connector if selected selectedConnectorId is in list of connectors', () => {
    const conversation: Conversation = {
      id: 'conversation_id',
      messages: [],
      apiConfig: {},
    };
    const { getByText } = render(
      <TestProviders>
        <ConnectorSelectorInline
          isDisabled={false}
          onConnectorModalVisibilityChange={noop}
          onConnectorSelectionChange={noop}
          selectedConnectorId={mockConnectors[0].id}
          selectedConversation={conversation}
        />
      </TestProviders>
    );
    expect(getByText(mockConnectors[0].name)).toBeInTheDocument();
  });
});
