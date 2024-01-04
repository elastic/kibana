/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';
import { ConnectorMissingCallout } from '.';
import { AssistantAvailability } from '../../..';
import { TestProviders } from '../../mock/test_providers/test_providers';

describe('connectorMissingCallout', () => {
  describe('when connectors and actions privileges', () => {
    describe('are `READ`', () => {
      const assistantAvailability: AssistantAvailability = {
        hasAssistantPrivilege: true,
        hasConnectorsAllPrivilege: false,
        hasConnectorsReadPrivilege: true,
        isAssistantEnabled: true,
      };

      it('should show connector privileges required button if no connectors exist', async () => {
        const { queryByTestId } = render(
          <TestProviders assistantAvailability={assistantAvailability}>
            <ConnectorMissingCallout
              isConnectorConfigured={false}
              isSettingsModalVisible={false}
              setIsSettingsModalVisible={jest.fn()}
            />
          </TestProviders>
        );

        expect(queryByTestId('connectorButton')).toBeInTheDocument();
      });

      it('should NOT show connector privileges required button if at least one connector exists', async () => {
        const { queryByTestId } = render(
          <TestProviders assistantAvailability={assistantAvailability}>
            <ConnectorMissingCallout
              isConnectorConfigured={true}
              isSettingsModalVisible={false}
              setIsSettingsModalVisible={jest.fn()}
            />
          </TestProviders>
        );

        expect(queryByTestId('connectorButton')).not.toBeInTheDocument();
      });
    });

    describe('are `NONE`', () => {
      const assistantAvailability: AssistantAvailability = {
        hasAssistantPrivilege: true,
        hasConnectorsAllPrivilege: false,
        hasConnectorsReadPrivilege: false,
        isAssistantEnabled: true,
      };

      it('should show connector privileges required button', async () => {
        const { queryByTestId } = render(
          <TestProviders assistantAvailability={assistantAvailability}>
            <ConnectorMissingCallout
              isConnectorConfigured={true}
              isSettingsModalVisible={false}
              setIsSettingsModalVisible={jest.fn()}
            />
          </TestProviders>
        );

        expect(queryByTestId('connectorButton')).toBeInTheDocument();
      });
    });
  });
});
