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
import { TestModelButton } from './test_model_button';

jest.mock(
  '../all_inference_endpoints/render_table_columns/render_actions/actions/test_endpoint/test_endpoint_modal',
  () => ({
    TestEndpointModal: ({
      target,
      taskType,
      onClose,
    }: {
      target: { connectorId: string; connectorName: string };
      taskType: string;
      onClose: () => void;
    }) => (
      <div data-test-subj="test-modal">
        {`${target.connectorId}|${target.connectorName}|${taskType}`}
        <button data-test-subj="close-modal" onClick={onClose} type="button">
          Close
        </button>
      </div>
    ),
  })
);

const renderButton = () =>
  render(
    <I18nProvider>
      <TestModelButton connectorId="ep-1" label="Claude" />
    </I18nProvider>
  );

describe('TestModelButton', () => {
  it('does not show the modal until clicked', () => {
    renderButton();

    expect(screen.queryByTestId('test-modal')).not.toBeInTheDocument();
  });

  it('opens the test modal for the model as a chat completion model', () => {
    renderButton();

    fireEvent.click(screen.getByTestId('test-endpoint-ep-1'));

    expect(screen.getByTestId('test-modal')).toHaveTextContent('ep-1|Claude|chat_completion');
  });

  it('closes the modal', () => {
    renderButton();

    fireEvent.click(screen.getByTestId('test-endpoint-ep-1'));
    fireEvent.click(screen.getByTestId('close-modal'));

    expect(screen.queryByTestId('test-modal')).not.toBeInTheDocument();
  });
});
