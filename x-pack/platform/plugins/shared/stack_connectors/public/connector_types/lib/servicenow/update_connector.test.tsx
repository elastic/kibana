/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import userEvent from '@testing-library/user-event';
import type { Props } from './update_connector';
import { UpdateConnector } from './update_connector';
import { screen, waitFor } from '@testing-library/react';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

const renderUpdateConnector = (props: Partial<Props> = {}, isOAuth: boolean = false) => {
  return renderWithI18n(
    <UpdateConnector
      actionTypeId=".servicenow"
      isOAuth={isOAuth}
      updateErrorMessage={null}
      readOnly={false}
      isLoading={false}
      onConfirm={() => {}}
      onCancel={() => {}}
      {...props}
    />
  );
};

// FLAKY: https://github.com/elastic/kibana/issues/209007
describe.skip('UpdateConnector renders', () => {
  it('should render update connector fields', () => {
    renderUpdateConnector();

    expect(screen.getByTestId('snUpdateInstallationCallout')).toBeInTheDocument();
    expect(screen.getByTestId('updateConnectorForm')).toBeInTheDocument();
    expect(screen.getByTestId('credentialsApiUrlFromInput')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-username-form-input')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-password-form-input')).toBeInTheDocument();
  });

  it('should render update connector fields for OAuth', () => {
    renderUpdateConnector({}, true);

    expect(screen.getByTestId('connector-servicenow-client-id-form-input')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-client-secret-form-input')).toBeInTheDocument();
    expect(
      screen.getByTestId('connector-servicenow-user-identifier-form-input')
    ).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-jwt-key-id-form-input')).toBeInTheDocument();
    expect(screen.getByTestId('connector-servicenow-private-key-form-input')).toBeInTheDocument();
    expect(
      screen.getByTestId('connector-servicenow-private-key-password-form-input')
    ).toBeInTheDocument();
  });

  it('should disable inputs on loading', async () => {
    renderUpdateConnector({ isLoading: true });

    expect(screen.getByTestId('credentialsApiUrlFromInput')).toBeDisabled();
    expect(screen.getByTestId('connector-servicenow-username-form-input')).toBeDisabled();
    expect(screen.getByTestId('connector-servicenow-password-form-input')).toBeDisabled();
  });

  it('should disable inputs on loading for OAuth', () => {
    renderUpdateConnector({ isLoading: true }, true);

    expect(screen.getByTestId('connector-servicenow-client-id-form-input')).toBeDisabled();
    expect(screen.getByTestId('connector-servicenow-client-secret-form-input')).toBeDisabled();
    expect(screen.getByTestId('connector-servicenow-user-identifier-form-input')).toBeDisabled();
    expect(screen.getByTestId('connector-servicenow-jwt-key-id-form-input')).toBeDisabled();
    expect(screen.getByTestId('connector-servicenow-private-key-form-input')).toBeDisabled();
    expect(
      screen.getByTestId('connector-servicenow-private-key-password-form-input')
    ).toBeDisabled();
  });

  it('should set inputs as read-only', () => {
    renderUpdateConnector({ readOnly: true });

    expect(screen.getByTestId('credentialsApiUrlFromInput')).toHaveAttribute('readOnly');
    expect(screen.getByTestId('connector-servicenow-username-form-input')).toHaveAttribute(
      'readOnly'
    );
    expect(screen.getByTestId('connector-servicenow-password-form-input')).toHaveAttribute(
      'readOnly'
    );
  });

  it('should set inputs as read-only for OAuth', () => {
    renderUpdateConnector({ readOnly: true }, true);

    expect(screen.getByTestId('connector-servicenow-client-id-form-input')).toHaveAttribute(
      'readOnly'
    );
    expect(screen.getByTestId('connector-servicenow-client-secret-form-input')).toHaveAttribute(
      'readOnly'
    );
    expect(screen.getByTestId('connector-servicenow-user-identifier-form-input')).toHaveAttribute(
      'readOnly'
    );
    expect(screen.getByTestId('connector-servicenow-jwt-key-id-form-input')).toHaveAttribute(
      'readOnly'
    );
    expect(screen.getByTestId('connector-servicenow-private-key-form-input')).toHaveAttribute(
      'readOnly'
    );
    expect(
      screen.getByTestId('connector-servicenow-private-key-password-form-input')
    ).toHaveAttribute('readOnly');
  });

  it('should disable submit button on form errors', async () => {
    renderUpdateConnector();

    await userEvent.click(screen.getByTestId('snUpdateInstallationSubmit'));

    expect(screen.getByTestId('snUpdateInstallationSubmit')).toBeDisabled();
  });

  it('should confirm the update when submit button clicked', async () => {
    const onConfirm = jest.fn();

    renderWithI18n(
      <UpdateConnector
        actionTypeId=".servicenow"
        isOAuth={false}
        updateErrorMessage={null}
        readOnly={false}
        isLoading={false}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    expect(onConfirm).not.toHaveBeenCalled();

    const urlInput = screen.getByTestId('credentialsApiUrlFromInput');
    const usernameInput = screen.getByTestId('connector-servicenow-username-form-input');
    const passwordInput = screen.getByTestId('connector-servicenow-password-form-input');
    const submitButton = screen.getByTestId('snUpdateInstallationSubmit');

    await userEvent.type(urlInput, 'https://example.com', { delay: 100 });
    await userEvent.type(usernameInput, 'user', { delay: 100 });
    await userEvent.type(passwordInput, 'pass', { delay: 100 });
    await userEvent.click(submitButton);

    // Wait for click event to be processed
    await waitFor(() => expect(onConfirm).toHaveBeenCalled(), { timeout: 3000 });

    expect(onConfirm).toHaveBeenCalledWith({
      config: {
        apiUrl: 'https://example.com',
      },
      secrets: {
        password: 'pass',
        username: 'user',
      },
    });
  });

  it('should cancel the update when cancel button clicked', async () => {
    const onCancel = jest.fn();
    renderUpdateConnector({ onCancel });

    expect(onCancel).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('snUpdateInstallationCancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show error message if present', () => {
    const updateErrorMessage = 'some application error';
    renderUpdateConnector({ updateErrorMessage });
    const applicationCallout = screen.getByTestId('snApplicationCallout');

    expect(applicationCallout).toBeInTheDocument();
    expect(applicationCallout).toHaveTextContent(updateErrorMessage);
  });
});
