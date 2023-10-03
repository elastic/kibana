/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConnectorSelector } from '.';
import { fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { ActionType } from '@kbn/actions-plugin/common';

const onConnectorSelectionChange = jest.fn();
const setIsOpen = jest.fn();
const defaultProps = {
  isDisabled: false,
  onConnectorSelectionChange,
  selectedConnectorId: 'connectorId',
  setIsOpen,
};

const connectorTwo = {
  id: 'connectorId2',
  name: 'Professor Connector',
  isMissingSecrets: false,
  actionTypeId: '.gen-ai',
  config: {
    apiProvider: 'OpenAI',
  },
};
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
  connectorTwo,
];

const actionTypes = [
  {
    id: '.gen-ai',
    name: 'OpenAI',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    isSystemActionType: true,
    supportedFeatureIds: ['generativeAI'],
  } as ActionType,
  {
    id: '.bedrock',
    name: 'Bedrock',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    isSystemActionType: true,
    supportedFeatureIds: ['generativeAI'],
  } as ActionType,
];
const mockRefetchConnectors = jest.fn();
jest.mock('../use_load_connectors', () => ({
  useLoadConnectors: jest.fn(() => {
    return {
      data: mockConnectors,
      error: null,
      isSuccess: true,
      isLoading: false,
      isFetching: false,
      refetch: mockRefetchConnectors,
    };
  }),
}));

jest.mock('../use_load_action_types', () => ({
  useLoadActionTypes: jest.fn(() => {
    return {
      data: actionTypes,
    };
  }),
}));

const newConnector = { actionTypeId: '.gen-ai', name: 'cool name' };

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/constants', () => ({
  // @ts-ignore
  ConnectorAddModal: ({ postSaveEventHandler }) => (
    <button
      type="button"
      data-test-subj="modal-mock"
      onClick={() => postSaveEventHandler(newConnector)}
    />
  ),
}));

describe('Connector selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders empty selection if no selected connector is provided', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} selectedConnectorId={undefined} />
      </TestProviders>
    );
    expect(getByTestId('connector-selector')).toBeInTheDocument();
    expect(getByTestId('connector-selector')).toHaveTextContent('');
  });
  it('renders with provided selected connector', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('connector-selector')).toBeInTheDocument();
    expect(getByTestId('connector-selector')).toHaveTextContent('Captain Connector');
  });
  it('Calls onConnectorSelectionChange with new selection', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('connector-selector')).toBeInTheDocument();
    fireEvent.click(getByTestId('connector-selector'));
    fireEvent.click(getByTestId(connectorTwo.id));
    expect(onConnectorSelectionChange).toHaveBeenCalledWith({
      ...connectorTwo,
      connectorTypeTitle: 'OpenAI',
    });
  });
  it('Displays ActionTypeSelectorModal when "Add a new connector" is selected, then calls onConnectorSelectionChange once new connector is saved', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    fireEvent.click(getByTestId('addNewConnectorButton'));
    expect(getByTestId('action-type-selector-modal')).toBeInTheDocument();
    fireEvent.click(getByTestId(`action-option-${actionTypes[1].name}`));
    expect(queryByTestId('action-type-selector-modal')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('modal-mock'));
    expect(onConnectorSelectionChange).toHaveBeenCalledWith({
      ...newConnector,
      connectorTypeTitle: 'OpenAI',
    });
    expect(mockRefetchConnectors).toHaveBeenCalled();
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
