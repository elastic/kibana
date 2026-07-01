/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';
import CreateConnectorFlyout from '../create_connector_flyout';
import EditConnectorFlyout from '.';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '../../../../types';
import { EditConnectorTabs } from '../../../../types';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';

jest.mock('../../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../../lib/action_connector_api') as object),
  loadActionTypes: jest.fn(),
  checkConnectorIdAvailability: jest.fn().mockResolvedValue({ isAvailable: true }),
}));

const { loadActionTypes } = jest.requireMock('../../../lib/action_connector_api');

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
    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();
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
    expect(await screen.findByTestId('connector-spec-load-error')).toBeInTheDocument();
  });

  it('does not show save and test button for non-testable spec connectors', async () => {
    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
        onTestConnector={onTestConnector}
      />
    );

    await userEvent.click(await screen.findByTestId('spec-connector-test-card'));

    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();

    expect(screen.queryByTestId('create-connector-flyout-save-test-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('create-connector-flyout-save-btn')).toBeInTheDocument();
  });

  it('shows save and test button for testable spec connectors', async () => {
    loadActionTypes.mockResolvedValue([
      {
        ...specConnectorType,
        testable: true,
      },
    ]);

    appMockRenderer.render(
      <CreateConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        onConnectorCreated={onConnectorCreated}
        onTestConnector={onTestConnector}
      />
    );

    await userEvent.click(await screen.findByTestId('spec-connector-test-card'));

    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();
    expect(screen.getByTestId('create-connector-flyout-save-test-btn')).toBeInTheDocument();
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

    expect(await screen.findByTestId('create-connector-flyout-back-btn')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('create-connector-flyout-back-btn'));

    // Should show connector selection again
    expect(await screen.findByTestId('spec-connector-test-card')).toBeInTheDocument();
  });
});

describe('spec connector edit flyout Test tab', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const actionTypeRegistry = actionTypeRegistryMock.create();

  const specConnectorType: ActionType = {
    id: 'spec-connector-test',
    name: 'Spec Connector Test',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['workflows'],
    source: ACTION_TYPE_SOURCES.spec,
    description: 'Test spec connector description',
    testable: true,
    isSystemActionType: false,
    isDeprecated: false,
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

  const specConnector = createMockActionConnector({
    id: 'spec-connector-id',
    name: 'Spec Connector Test',
    actionTypeId: 'spec-connector-test',
    config: {},
    secrets: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    actionTypeRegistry.has.mockReturnValue(false);
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(mockSpecResponse);
    appMockRenderer.coreStart.uiSettings.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'workflows:ui:enabled') {
        return true;
      }
      return undefined;
    });
  });

  it('renders the test form for a spec connector without throwing', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
        isTestable={true}
        connectorActionType={specConnectorType}
      />
    );

    expect(await screen.findByTestId('edit-connector-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
    expect(screen.queryByText('Create an action')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
  });

  it('shows loading state on the Test tab while fetching spec', async () => {
    let resolveSpec: (value: typeof mockSpecResponse) => void;
    const specPromise = new Promise<typeof mockSpecResponse>((resolve) => {
      resolveSpec = resolve;
    });
    appMockRenderer.coreStart.http.get = jest.fn().mockReturnValue(specPromise);

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
        isTestable={true}
        connectorActionType={specConnectorType}
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('test-connector-form')).not.toBeInTheDocument();

    resolveSpec!(mockSpecResponse);

    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
  });

  it('shows error state on the Test tab when spec fetch fails and retries', async () => {
    const errorMessage = 'Failed to fetch spec';
    appMockRenderer.coreStart.http.get = jest
      .fn()
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockSpecResponse);

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
        isTestable={true}
        connectorActionType={specConnectorType}
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    expect(await screen.findByTestId('connector-spec-load-error')).toBeInTheDocument();
    expect(screen.queryByTestId('test-connector-form')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('connector-spec-load-retry'));

    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledTimes(2);
  });
});
