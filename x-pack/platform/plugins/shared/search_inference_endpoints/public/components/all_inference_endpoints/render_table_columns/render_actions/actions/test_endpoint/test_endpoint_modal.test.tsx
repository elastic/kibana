/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { TestEndpointModal } from './test_endpoint_modal';
import { useTestEndpoint } from '../../../../../../hooks/use_test_endpoint';

jest.mock('../../../../../../hooks/use_test_endpoint');

const mockUseTestEndpoint = useTestEndpoint as jest.Mock;
const mockMutate = jest.fn();
const onClose = jest.fn();

const mockHookState = (state: Record<string, unknown> = {}) =>
  mockUseTestEndpoint.mockReturnValue({
    mutate: mockMutate,
    data: undefined,
    error: null,
    isLoading: false,
    ...state,
  });

const renderModal = () =>
  render(
    <EuiThemeProvider>
      <I18nProvider>
        <TestEndpointModal inferenceId="my-endpoint" onClose={onClose} />
      </I18nProvider>
    </EuiThemeProvider>
  );

const passingState = {
  data: {
    ok: true,
    latencyMs: 94,
    statusCode: 201,
    raw: { content: 'Hello world', tokens: { total: 12 } },
  },
};

const failingState = {
  data: {
    ok: false,
    latencyMs: 94,
    statusCode: 404,
    error: { reason: 'endpoint not found' },
  },
};

describe('TestEndpointModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the endpoint id in a read-only field', () => {
    mockHookState();
    renderModal();

    expect(screen.getByTestId('testEndpointId')).toHaveValue('my-endpoint');
    expect(screen.getByTestId('testEndpointId')).toHaveAttribute('readonly');
  });

  it('asks the user to run the test until it has run', () => {
    mockHookState();
    renderModal();

    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('testEndpointIdle')).toHaveTextContent(
      'Run test to confirm endpoint availability.'
    );
    expect(screen.queryByTestId('testEndpointSummary')).not.toBeInTheDocument();
  });

  it('tests the endpoint when clicking test', () => {
    mockHookState();
    renderModal();

    fireEvent.click(screen.getByTestId('testEndpointRunButton'));

    expect(mockMutate).toHaveBeenCalledWith('my-endpoint');
  });

  it('waits for the response while the test runs', () => {
    mockHookState({ isLoading: true });
    renderModal();

    expect(screen.getByTestId('testEndpointLoading')).toHaveTextContent('Waiting for response...');
    expect(screen.getByTestId('testEndpointRunButton')).toBeDisabled();
  });

  it('shows that the test succeeded with the response code and query duration', () => {
    mockHookState(passingState);
    renderModal();

    expect(screen.getByTestId('testEndpointAvailable')).toHaveTextContent('Test succeeded.');
    expect(screen.getByTestId('testEndpointSummary')).toHaveTextContent(
      'Response: 201 • Query duration: 94 ms'
    );
    expect(screen.queryByTestId('testEndpointFailure')).not.toBeInTheDocument();
  });

  it('shows that the test failed with the response code and query duration', () => {
    mockHookState(failingState);
    renderModal();

    expect(screen.getByTestId('testEndpointFailure')).toHaveTextContent('Endpoint test failed.');
    expect(screen.getByTestId('testEndpointSummary')).toHaveTextContent(
      'Response: 404 • Query duration: 94 ms'
    );
    expect(screen.queryByTestId('testEndpointAvailable')).not.toBeInTheDocument();
  });

  it('shows only the query duration when the failure has no response code', () => {
    mockHookState({
      data: { ok: false, latencyMs: 94, error: { reason: 'socket hang up' } },
    });
    renderModal();

    expect(screen.getByTestId('testEndpointSummary')).toHaveTextContent('Query duration: 94 ms');
    expect(screen.getByTestId('testEndpointSummary')).not.toHaveTextContent('Response:');
  });

  describe('raw response', () => {
    it('is hidden until the user asks for it', () => {
      mockHookState(passingState);
      renderModal();

      expect(screen.getByTestId('testEndpointRawToggle')).toHaveTextContent('Show raw response');
      expect(screen.queryByTestId('testEndpointRawResponse')).not.toBeInTheDocument();
    });

    it('shows the response as formatted JSON when the user asks for it', () => {
      mockHookState(passingState);
      renderModal();

      fireEvent.click(screen.getByTestId('testEndpointRawToggle'));

      expect(screen.getByTestId('testEndpointRawResponse')).toHaveTextContent('"total": 12');
      expect(screen.getByTestId('testEndpointRawToggle')).toHaveTextContent('Hide raw response');
    });

    it('hides the response again when the user hides it', () => {
      mockHookState(passingState);
      renderModal();

      fireEvent.click(screen.getByTestId('testEndpointRawToggle'));
      fireEvent.click(screen.getByTestId('testEndpointRawToggle'));

      expect(screen.queryByTestId('testEndpointRawResponse')).not.toBeInTheDocument();
    });

    it('shows the error when the test failed', () => {
      mockHookState(failingState);
      renderModal();

      fireEvent.click(screen.getByTestId('testEndpointRawToggle'));

      expect(screen.getByTestId('testEndpointRawResponse')).toHaveTextContent(
        '"reason": "endpoint not found"'
      );
    });
  });

  it('shows the request error when the test request itself fails', () => {
    mockHookState({ error: { body: { message: 'Forbidden' }, message: 'Forbidden' } });
    renderModal();

    expect(screen.getByTestId('testEndpointRequestFailure')).toHaveTextContent(
      'The test could not run.'
    );
    expect(screen.getByTestId('testEndpointRequestFailure')).toHaveTextContent('Forbidden');
  });

  it('closes when clicking close', () => {
    mockHookState();
    renderModal();

    fireEvent.click(screen.getByTestId('testEndpointCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
