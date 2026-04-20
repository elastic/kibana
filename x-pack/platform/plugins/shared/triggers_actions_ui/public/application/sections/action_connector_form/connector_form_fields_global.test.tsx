/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { FormTestProvider } from '../../components/test_utils';
import { ConnectorFormFieldsGlobal } from './connector_form_fields_global';
import { useKibana } from '../../../common/lib/kibana';
import { httpServiceMock } from '@kbn/core/public/mocks';

jest.mock('../../../common/lib/kibana');
jest.mock('../../lib/action_connector_api', () => ({
  ...jest.requireActual('../../lib/action_connector_api'),
  checkConnectorIdAvailability: jest.fn(),
}));

const { checkConnectorIdAvailability } = jest.requireMock('../../lib/action_connector_api');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('ConnectorFormFieldsGlobal', () => {
  const onSubmit = jest.fn();
  const defaultValue = {
    id: 'test-id',
    actionTypeId: '.test',
    isDeprecated: 'false',
    name: 'My test connector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const httpMock = httpServiceMock.createStartContract();
    useKibanaMock().services.http = httpMock;
    checkConnectorIdAvailability.mockResolvedValue({ isAvailable: true });
  });

  it('submits correctly', async () => {
    render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFieldsGlobal canSave={true} isEdit={false} />
      </FormTestProvider>
    );

    expect(screen.getByTestId('nameInput')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('form-test-provide-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        data: {
          actionTypeId: '.test',
          id: 'my-test-connector',
          isDeprecated: 'false',
          name: 'My test connector',
        },
        isValid: true,
      });
    });
  });

  it('validates the name correctly', async () => {
    render(
      /**
       * By removing the default value we initiate the form
       * with an empty state. Submitting the form
       * should return an error because the text field "name"
       * is empty.
       */
      <FormTestProvider onSubmit={onSubmit}>
        <ConnectorFormFieldsGlobal canSave={true} isEdit={false} />
      </FormTestProvider>
    );

    await userEvent.click(screen.getByTestId('form-test-provide-submit'));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        data: {},
        isValid: false,
      });
    });
  });

  it('shows error when connector ID is already in use', async () => {
    checkConnectorIdAvailability.mockResolvedValue({ isAvailable: false });

    render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFieldsGlobal canSave={true} isEdit={false} />
      </FormTestProvider>
    );

    const idInput = screen.getByTestId('connectorIdInput');
    await userEvent.clear(idInput);
    await userEvent.type(idInput, 'existing-connector-id');

    await waitFor(
      () => {
        expect(
          screen.getByText('A connector is already using this ID. Choose a different ID.')
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('shows error when connector ID availability check fails', async () => {
    checkConnectorIdAvailability.mockRejectedValue(new Error('Network error'));

    render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFieldsGlobal canSave={true} isEdit={false} />
      </FormTestProvider>
    );

    const idInput = screen.getByTestId('connectorIdInput');
    await userEvent.clear(idInput);
    await userEvent.type(idInput, 'some-connector-id');

    await waitFor(
      () => {
        expect(screen.getByText('Unable to verify connector ID availability.')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('does not check connector ID availability in edit mode', async () => {
    render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFieldsGlobal canSave={true} isEdit={true} />
      </FormTestProvider>
    );

    expect(screen.getByTestId('connectorIdInput')).toBeDisabled();

    await userEvent.click(screen.getByTestId('form-test-provide-submit'));

    await waitFor(() => {
      expect(checkConnectorIdAvailability).not.toHaveBeenCalled();
    });
  });

  it('auto-populates connector ID from name when creating', async () => {
    render(
      <FormTestProvider onSubmit={onSubmit}>
        <ConnectorFormFieldsGlobal canSave={true} isEdit={false} />
      </FormTestProvider>
    );

    const nameInput = screen.getByTestId('nameInput');
    await userEvent.type(nameInput, 'My New Connector');

    await waitFor(() => {
      expect(screen.getByTestId('connectorIdInput')).toHaveValue('my-new-connector');
    });
  });

  it('truncates auto-populated connector ID to 36 characters', async () => {
    render(
      <FormTestProvider onSubmit={onSubmit}>
        <ConnectorFormFieldsGlobal canSave={true} isEdit={false} />
      </FormTestProvider>
    );

    const nameInput = screen.getByTestId('nameInput');
    // Type a name that would generate a slug longer than 36 characters
    await userEvent.type(nameInput, 'This Is A Very Long Connector Name That Exceeds The Limit');

    await waitFor(() => {
      const idInput = screen.getByTestId('connectorIdInput');
      const idValue = (idInput as HTMLInputElement).value;
      expect(idValue.length).toBeLessThanOrEqual(36);
      expect(idValue.endsWith('-')).toBe(false);
    });
  });
});
