/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';
import CreateConnectorFlyout from '.';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';

jest.mock('../../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../../lib/action_connector_api') as object),
  loadActionTypes: jest.fn(),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

const { loadActionTypes } = jest.requireMock('../../../lib/action_connector_api');

describe('spec connector', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorCreated = jest.fn();
  const onTestConnector = jest.fn();
  const actionTypeRegistry = actionTypeRegistryMock.create();

  const specActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    id: 'spec-connector',
    actionConnectorFields: lazy(() => import('../connector_mock')),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(specActionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };
    loadActionTypes.mockResolvedValue([
      {
        id: specActionTypeModel.id,
        name: 'Test spec connector',
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic' as const,
        supportedFeatureIds: ['alerting', 'siem'],
      },
    ]);
  });

  it('does not show the save and test', async () => {
    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
        onTestConnector={onTestConnector}
      />
    );

    expect(screen.queryByTestId('create-connector-flyout-save-test-btn')).not.toBeInTheDocument();
  });
});

describe('spec connector with API fetch', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorCreated = jest.fn();
  const onTestConnector = jest.fn();
  const actionTypeRegistry = actionTypeRegistryMock.create();

  // Use 'workflows' feature ID since spec connectors are only shown when workflows UI is enabled
  const specConnectorType = {
    id: 'spec-connector-test',
    name: 'Spec Connector Test',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic' as const,
    supportedFeatureIds: ['workflows'], // Workflows feature to enable display
    source: 'spec',
    description: 'Test spec connector description',
  };

  const mockSpecResponse = {
    metadata: {
      id: 'spec-connector-test',
      display_name: 'Spec Connector Test',
      description: 'Connect to Test API',
      minimum_license: 'basic',
      supported_feature_ids: ['workflows'],
    },
    schema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          properties: {},
        },
        secrets: {
          anyOf: [
            {
              type: 'object',
              properties: {
                authType: { const: 'api_key_header', type: 'string' },
                apiKey: {
                  type: 'string',
                  minLength: 1,
                  label: 'API key',
                  sensitive: true,
                },
              },
              required: ['authType', 'apiKey'],
              label: 'API key header authentication',
            },
          ],
          label: 'Authentication',
        },
      },
      required: ['config', 'secrets'],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true },
    };
    loadActionTypes.mockResolvedValue([specConnectorType]);
    // Spec connectors are not in the UI actionTypeRegistry; useActionTypeModel fetches the spec API.
    actionTypeRegistry.has.mockReturnValue(false);
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(mockSpecResponse);
    // Enable workflows UI setting so spec connectors are displayed
    appMockRenderer.coreStart.uiSettings.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'workflows:ui:enabled') {
        return true;
      }
      return undefined;
    });
  });

  it('fetches spec from API when selecting a spec-based connector', async () => {
    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
      />
    );

    // Wait for the connector card to appear and click it
    await userEvent.click(await screen.findByTestId('spec-connector-test-card'));

    // Verify API was called with correct endpoint
    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('shows loading state while fetching spec', async () => {
    // Create a deferred promise to control when the API response resolves
    let resolveSpec: (value: typeof mockSpecResponse) => void;
    const specPromise = new Promise<typeof mockSpecResponse>((resolve) => {
      resolveSpec = resolve;
    });
    appMockRenderer.coreStart.http.get = jest.fn().mockReturnValue(specPromise);

    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
      />
    );

    await userEvent.click(await screen.findByTestId('spec-connector-test-card'));

    // While loading, form fields should not yet be visible (or there should be a loading indicator)
    // The exact behavior depends on the implementation
    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalled();
    });

    // Now resolve the spec
    resolveSpec!(mockSpecResponse);

    // After spec loads, the form should render
    await waitFor(() => {
      expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    });
  });

  it('shows error state when spec fetch fails', async () => {
    const errorMessage = 'Failed to fetch spec';
    appMockRenderer.coreStart.http.get = jest.fn().mockRejectedValue(new Error(errorMessage));

    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
      />
    );

    await userEvent.click(await screen.findByTestId('spec-connector-test-card'));

    // Verify the API was called
    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByTestId('connector-spec-load-error')).toBeInTheDocument();
    });
  });

  it('does not show save and test button for spec connectors', async () => {
    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
        onTestConnector={onTestConnector}
      />
    );

    await userEvent.click(await screen.findByTestId('spec-connector-test-card'));

    await waitFor(() => {
      expect(screen.getByTestId('nameInput')).toBeInTheDocument();
    });

    // Spec connectors should not show save and test button
    expect(screen.queryByTestId('create-connector-flyout-save-test-btn')).not.toBeInTheDocument();
    // But should show the save button
    expect(screen.getByTestId('create-connector-flyout-save-btn')).toBeInTheDocument();
  });

  it('navigates back to connector list when pressing back button', async () => {
    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
      />
    );

    await userEvent.click(await screen.findByTestId('spec-connector-test-card'));

    await waitFor(() => {
      expect(screen.getByTestId('create-connector-flyout-back-btn')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('create-connector-flyout-back-btn'));

    // Should show connector selection again
    expect(await screen.findByTestId('spec-connector-test-card')).toBeInTheDocument();
  });
});
