/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConnectorSelector } from '.';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { mockAssistantAvailability, TestProviders } from '../../mock/test_providers/test_providers';
import { mockActionTypes, mockConnectors } from '../../mock/connectors';
import * as i18n from '../translations';
import { useLoadConnectors } from '../use_load_connectors';
import { createMockUseLoadConnectorsResult } from '../../mock/test_helpers';

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
  useLoadConnectors: jest.fn(),
}));

jest.mock('../use_load_action_types', () => ({
  useLoadActionTypes: jest.fn(() => {
    return {
      data: mockActionTypes,
    };
  }),
}));

const newConnector = { actionTypeId: '.gen-ai', name: 'cool name' };

const OriginalMutationObserver = global.MutationObserver;

beforeAll(() => {
  class MockMutationObserver {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  global.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver;
});

afterAll(() => {
  global.MutationObserver = OriginalMutationObserver;
});

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
    jest.mocked(useLoadConnectors).mockReturnValue(
      createMockUseLoadConnectorsResult({
        data: mockConnectors,
        error: null,
        isSuccess: true,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetchConnectors,
      })
    );
  });

  it('enables add connector button when user can create connectors and none exist', () => {
    jest.mocked(useLoadConnectors).mockReturnValue(
      createMockUseLoadConnectorsResult({
        data: [],
        error: null,
        isSuccess: true,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetchConnectors,
      })
    );

    render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} selectedConnectorId={undefined} />
      </TestProviders>
    );

    const addButton = screen.getByTestId('addNewConnectorButton');
    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeEnabled();
  });

  it('disables add connector button when user cannot create connectors', () => {
    jest.mocked(useLoadConnectors).mockReturnValue(
      createMockUseLoadConnectorsResult({
        data: [],
        error: null,
        isSuccess: true,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetchConnectors,
      })
    );

    render(
      <TestProviders
        assistantAvailability={{
          ...mockAssistantAvailability,
          hasConnectorsAllPrivilege: false,
          hasConnectorsReadPrivilege: true,
        }}
      >
        <ConnectorSelector {...defaultProps} selectedConnectorId={undefined} />
      </TestProviders>
    );

    const addButton = screen.getByTestId('addNewConnectorButton');
    expect(addButton).toBeInTheDocument();
    expect(addButton).toBeDisabled();
  });

  it('shows tooltip with missing privileges message when hovering disabled add connector button', () => {
    jest.useFakeTimers();
    jest.mocked(useLoadConnectors).mockReturnValue(
      createMockUseLoadConnectorsResult({
        data: [],
        error: null,
        isSuccess: true,
        isLoading: false,
        isFetching: false,
        refetch: mockRefetchConnectors,
      })
    );

    render(
      <TestProviders
        assistantAvailability={{
          ...mockAssistantAvailability,
          hasConnectorsAllPrivilege: false,
          hasConnectorsReadPrivilege: true,
        }}
      >
        <ConnectorSelector {...defaultProps} selectedConnectorId={undefined} />
      </TestProviders>
    );

    const addButton = screen.getByTestId('addNewConnectorButton');
    expect(addButton).toBeDisabled();

    fireEvent.mouseOver(addButton);
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      i18n.ADD_CONNECTOR_MISSING_PRIVILEGES_DESCRIPTION
    );
    jest.useRealTimers();
  });

  it('renders add new connector button if no selected connector is provided', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} selectedConnectorId={undefined} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('connector-selector'));
    expect(getByTestId('aiAssistantAddConnectorButton')).toBeInTheDocument();
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
    fireEvent.click(getByTestId('aiAssistantAddConnectorButton'));

    fireEvent.click(getByTestId('modal-mock'));

    expect(onConnectorSelectionChange).toHaveBeenCalledWith(newConnector);
    expect(mockRefetchConnectors).toHaveBeenCalled();
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });

  it('renders the expected placeholder when selectedConnectorId is undefined', () => {
    render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} selectedConnectorId={undefined} />
      </TestProviders>
    );

    expect(screen.getByTestId('connector-selector')).toHaveTextContent(
      i18n.INLINE_CONNECTOR_PLACEHOLDER
    );
  });

  it('does NOT render the placeholder when selectedConnectorId is defined', () => {
    render(
      <TestProviders>
        <ConnectorSelector {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('connector-selector')).not.toHaveTextContent(
      i18n.INLINE_CONNECTOR_PLACEHOLDER
    );
  });
});
