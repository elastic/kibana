/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

const renderModal = (
  taskType = 'chat_completion',
  target: React.ComponentProps<typeof TestEndpointModal>['target'] = { inferenceId: 'my-endpoint' }
) =>
  render(
    <I18nProvider>
      <TestEndpointModal target={target} taskType={taskType} onClose={onClose} />
    </I18nProvider>
  );

describe('TestEndpointModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not run a test until the user clicks test', () => {
    mockHookState();
    renderModal();

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('starts with a suggested message', () => {
    mockHookState();
    renderModal();

    expect(screen.getByTestId('testEndpointMessageInput')).toHaveValue('Reply "Hello world"');
  });

  it.each(['text_embedding', 'embedding', 'sparse_embedding'])(
    'starts with a short text for %s endpoints',
    (taskType) => {
      mockHookState();
      renderModal(taskType);

      expect(screen.getByTestId('testEndpointMessageInput')).toHaveValue('Hello Elastic');
    }
  );

  it('sends the message the user typed', () => {
    mockHookState();
    renderModal();

    fireEvent.change(screen.getByTestId('testEndpointMessageInput'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByTestId('testEndpointRunButton'));

    expect(mockMutate).toHaveBeenCalledWith({ inferenceId: 'my-endpoint', message: 'Hello there' });
  });

  it('disables the test button when the message is empty', () => {
    mockHookState();
    renderModal();

    fireEvent.change(screen.getByTestId('testEndpointMessageInput'), { target: { value: '  ' } });

    expect(screen.getByTestId('testEndpointRunButton')).toBeDisabled();
  });

  it('shows a spinner while the test runs', () => {
    mockHookState({ isLoading: true });
    renderModal();

    expect(screen.getByTestId('testEndpointLoading')).toBeInTheDocument();
  });

  it('shows the result and the latency when the test passes', () => {
    mockHookState({
      data: { ok: true, latencyMs: 245, result: { type: 'text', content: 'A search engine.' } },
    });
    renderModal();

    expect(screen.getByTestId('testEndpointResponse')).toHaveTextContent('A search engine.');
    expect(screen.getByTestId('testEndpointLatency')).toHaveTextContent('245 ms');
    expect(screen.queryByTestId('testEndpointFailure')).not.toBeInTheDocument();
  });

  describe('raw response', () => {
    const passingState = {
      data: {
        ok: true,
        latencyMs: 245,
        result: { type: 'text', content: 'A search engine.' },
        raw: { content: 'A search engine.', tokens: { total: 12 } },
      },
    };

    it('is hidden until the toggle is turned on', () => {
      mockHookState(passingState);
      renderModal();

      expect(screen.getByTestId('testEndpointRawToggle')).not.toBeChecked();
      expect(screen.queryByTestId('testEndpointRawResponse')).not.toBeInTheDocument();
    });

    it('shows the response as formatted JSON when the toggle is on', () => {
      mockHookState(passingState);
      renderModal();

      fireEvent.click(screen.getByTestId('testEndpointRawToggle'));

      expect(screen.getByTestId('testEndpointRawResponse')).toHaveTextContent('"total": 12');
    });

    it('hides the response again when the toggle is turned off', () => {
      mockHookState(passingState);
      renderModal();

      fireEvent.click(screen.getByTestId('testEndpointRawToggle'));
      fireEvent.click(screen.getByTestId('testEndpointRawToggle'));

      expect(screen.queryByTestId('testEndpointRawResponse')).not.toBeInTheDocument();
    });

    it('is not offered when the test fails', () => {
      mockHookState({
        data: { ok: false, latencyMs: 80, error: { cause: 'auth', reason: 'invalid key' } },
      });
      renderModal();

      expect(screen.queryByTestId('testEndpointRawToggle')).not.toBeInTheDocument();
    });
  });

  it('shows the cause and the provider message when the test fails', () => {
    mockHookState({
      data: {
        ok: false,
        latencyMs: 80,
        error: { cause: 'auth', reason: 'invalid x-api-key', statusCode: 401 },
      },
    });
    renderModal();

    expect(screen.getByTestId('testEndpointFailure')).toHaveTextContent('Authentication failed');
    expect(screen.getByTestId('testEndpointFailure')).toHaveTextContent('invalid x-api-key');
    expect(screen.queryByTestId('testEndpointResponse')).not.toBeInTheDocument();
  });

  it('shows the request error when the test request itself fails', () => {
    mockHookState({ error: { body: { message: 'Forbidden' }, message: 'Forbidden' } });
    renderModal();

    expect(screen.getByTestId('testEndpointRequestFailure')).toHaveTextContent('Forbidden');
  });

  it('does not ask for documents unless testing a rerank endpoint', () => {
    mockHookState();
    renderModal('text_embedding');

    expect(screen.queryByTestId('testEndpointDocumentsInput')).not.toBeInTheDocument();
  });

  describe('for a rerank endpoint', () => {
    it('sends the query and the documents, one per line', () => {
      mockHookState();
      renderModal('rerank');

      fireEvent.change(screen.getByTestId('testEndpointDocumentsInput'), {
        target: { value: 'first doc\n\n second doc ' },
      });
      fireEvent.click(screen.getByTestId('testEndpointRunButton'));

      expect(mockMutate).toHaveBeenCalledWith({
        inferenceId: 'my-endpoint',
        message: 'what capital of canada?',
        documents: ['first doc', 'second doc'],
      });
    });

    it('starts with an example query and input', () => {
      mockHookState();
      renderModal('rerank');

      expect(screen.getByTestId('testEndpointMessageInput')).toHaveValue('what capital of canada?');
      expect(screen.getByTestId('testEndpointDocumentsInput')).toHaveValue(
        'toronto\nottawa\ncalgary'
      );
    });

    it('disables the test button when there are no documents', () => {
      mockHookState();
      renderModal('rerank');

      fireEvent.change(screen.getByTestId('testEndpointDocumentsInput'), {
        target: { value: ' \n ' },
      });

      expect(screen.getByTestId('testEndpointRunButton')).toBeDisabled();
    });
  });

  it('does not send documents for other task types', () => {
    mockHookState();
    renderModal('completion');

    fireEvent.click(screen.getByTestId('testEndpointRunButton'));

    expect(mockMutate).toHaveBeenCalledWith({
      inferenceId: 'my-endpoint',
      message: 'Reply "Hello world"',
    });
  });

  describe('when testing a model by connector id', () => {
    const connectorTarget = { connectorId: 'my-connector', connectorName: 'My connector' };

    it('names the model in the title', () => {
      mockHookState();
      renderModal('chat_completion', connectorTarget);

      expect(screen.getByTestId('testEndpointModal')).toHaveTextContent('Test My connector');
    });

    it('sends the message with the connector id', () => {
      mockHookState();
      renderModal('chat_completion', connectorTarget);

      fireEvent.click(screen.getByTestId('testEndpointRunButton'));

      expect(mockMutate).toHaveBeenCalledWith({
        connectorId: 'my-connector',
        message: 'Reply "Hello world"',
      });
    });
  });

  describe('when testing a feature', () => {
    const featureTarget = { featureId: 'agent_builder', featureName: 'Agent Builder' };

    it('names the feature in the title', () => {
      mockHookState();
      renderModal('chat_completion', featureTarget);

      expect(screen.getByTestId('testEndpointModal')).toHaveTextContent('Test Agent Builder');
    });

    it('sends the message with the feature id', () => {
      mockHookState();
      renderModal('chat_completion', featureTarget);

      fireEvent.click(screen.getByTestId('testEndpointRunButton'));

      expect(mockMutate).toHaveBeenCalledWith({
        featureId: 'agent_builder',
        message: 'Reply "Hello world"',
      });
    });
  });

  it('closes when clicking close', () => {
    mockHookState();
    renderModal();

    fireEvent.click(screen.getByTestId('testEndpointCloseButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
