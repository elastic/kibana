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
import { mockActionTypes, mockConnectors } from '../../mock/connectors';

const onConnectorSelectionChange = jest.fn();
const setIsOpen = jest.fn();
const defaultProps = {
  isDisabled: false,
  onConnectorSelectionChange,
  selectedConnectorId: 'connectorId',
  setIsOpen,
};

const connectorTwo = mockConnectors[1];

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
      data: mockActionTypes,
    };
  }),
}));

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

describe('Connector selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders add new connector button if no selected connector is provided', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} selectedConnectorId={undefined} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
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
    expect(onConnectorSelectionChange).toHaveBeenCalledWith(connectorTwo);
  });
  it('Calls onConnectorSelectionChange once new connector is saved', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    fireEvent.click(getByTestId('addNewConnectorButton'));

    fireEvent.click(getByTestId('modal-mock'));

    expect(onConnectorSelectionChange).toHaveBeenCalledWith(newConnector);
    expect(mockRefetchConnectors).toHaveBeenCalled();
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
