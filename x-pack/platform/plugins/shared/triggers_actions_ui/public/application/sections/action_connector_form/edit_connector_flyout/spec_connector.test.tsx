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
import EditConnectorFlyout from '.';
import { TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
import { EditConnectorTabs } from '../../../../types';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';

describe('spec connector edit flyout Test tab', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const actionTypeRegistry = actionTypeRegistryMock.create();

  const mockSpecResponse = (isTestable: boolean) => ({
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
    is_testable: isTestable,
  });

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
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(mockSpecResponse(true));
    appMockRenderer.coreStart.uiSettings.get = jest.fn().mockImplementation((key: string) => {
      if (key === 'workflows:ui:enabled') {
        return true;
      }
      return undefined;
    });
  });

  describe('spec version', () => {
    it('loads and saves pinned version when catalog is enabled', async () => {
      const pinnedVersion = '1.3';
      const expectedVersion = '1.3';
      const spec = mockSpecResponse(true);

      appMockRenderer.coreStart.actions = {
        ...appMockRenderer.coreStart.actions,
        isCatalogEnabled: true,
      };
      appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue({
        ...spec,
        metadata: { ...spec.metadata, spec_version: pinnedVersion },
      });
      appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue({
        id: specConnector.id,
        name: 'Updated connector',
        connector_type_id: specConnector.actionTypeId,
        config: {},
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: false,
        spec_version: expectedVersion,
      });

      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          connector={{ ...specConnector, specVersion: pinnedVersion }}
          onClose={onClose}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      const nameInput = await screen.findByTestId('nameInput');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated connector');
      await userEvent.type(
        await screen.findByTestId('generator-field-secrets-apiKey'),
        'my-api-key'
      );
      await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

      const [getPath, getOptions] = (appMockRenderer.coreStart.http.get as jest.Mock).mock.calls[0];
      expect(getPath).toBe('/internal/actions/connector_types/spec-connector-test/spec');
      expect(getOptions.query).toEqual({ spec_version: expectedVersion });

      await waitFor(() => expect(onConnectorUpdated).toHaveBeenCalledTimes(1));
      expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledTimes(1);

      const [putPath, { body }] = (appMockRenderer.coreStart.http.put as jest.Mock).mock.calls[0];
      expect(putPath).toBe('/api/actions/connector/spec-connector-id');

      expect(JSON.parse(body).name).toBe('Updated connector');
      expect(JSON.parse(body).spec_version).toBe(expectedVersion);
      expect(onConnectorUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ specVersion: expectedVersion })
      );
    });

    it('loads and saves unversioned spec when catalog is enabled and no pinned version', async () => {
      const pinnedVersion = undefined;
      const expectedVersion = undefined;
      const spec = mockSpecResponse(true);

      appMockRenderer.coreStart.actions = {
        ...appMockRenderer.coreStart.actions,
        isCatalogEnabled: true,
      };
      appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue({
        ...spec,
        metadata: { ...spec.metadata, spec_version: pinnedVersion },
      });
      appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue({
        id: specConnector.id,
        name: 'Updated connector',
        connector_type_id: specConnector.actionTypeId,
        config: {},
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: false,
        spec_version: expectedVersion,
      });

      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          connector={{ ...specConnector, specVersion: pinnedVersion }}
          onClose={onClose}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      const nameInput = await screen.findByTestId('nameInput');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated connector');
      await userEvent.type(
        await screen.findByTestId('generator-field-secrets-apiKey'),
        'my-api-key'
      );
      await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

      const [getPath, getOptions] = (appMockRenderer.coreStart.http.get as jest.Mock).mock.calls[0];
      expect(getPath).toBe('/internal/actions/connector_types/spec-connector-test/spec');
      expect(getOptions).not.toHaveProperty(['query', 'spec_version']);

      await waitFor(() => expect(onConnectorUpdated).toHaveBeenCalledTimes(1));
      expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledTimes(1);

      const [putPath, { body }] = (appMockRenderer.coreStart.http.put as jest.Mock).mock.calls[0];
      expect(putPath).toBe('/api/actions/connector/spec-connector-id');

      expect(JSON.parse(body).name).toBe('Updated connector');
      expect(JSON.parse(body)).not.toHaveProperty('spec_version');
      expect(onConnectorUpdated.mock.calls[0][0]).not.toHaveProperty('specVersion');
    });

    it('loads and saves unversioned spec when catalog is disabled and a pinned version is available', async () => {
      const pinnedVersion = '1.3';
      const expectedVersion = undefined;
      const spec = mockSpecResponse(true);

      appMockRenderer.coreStart.actions = {
        ...appMockRenderer.coreStart.actions,
        isCatalogEnabled: false,
      };
      appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue({
        ...spec,
        metadata: { ...spec.metadata, spec_version: pinnedVersion },
      });
      appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue({
        id: specConnector.id,
        name: 'Updated connector',
        connector_type_id: specConnector.actionTypeId,
        config: {},
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        is_system_action: false,
        spec_version: expectedVersion,
      });

      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          connector={{ ...specConnector, specVersion: pinnedVersion }}
          onClose={onClose}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      const nameInput = await screen.findByTestId('nameInput');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated connector');
      await userEvent.type(
        await screen.findByTestId('generator-field-secrets-apiKey'),
        'my-api-key'
      );
      await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

      const [getPath, getOptions] = (appMockRenderer.coreStart.http.get as jest.Mock).mock.calls[0];
      expect(getPath).toBe('/internal/actions/connector_types/spec-connector-test/spec');
      expect(getOptions).not.toHaveProperty(['query', 'spec_version']);

      await waitFor(() => expect(onConnectorUpdated).toHaveBeenCalledTimes(1));
      expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledTimes(1);

      const [putPath, { body }] = (appMockRenderer.coreStart.http.put as jest.Mock).mock.calls[0];
      expect(putPath).toBe('/api/actions/connector/spec-connector-id');

      expect(JSON.parse(body).name).toBe('Updated connector');
      expect(JSON.parse(body)).not.toHaveProperty('spec_version');
      expect(onConnectorUpdated.mock.calls[0][0]).not.toHaveProperty('specVersion');
    });

    it('loads the pinned spec on the Test tab', async () => {
      appMockRenderer.coreStart.actions = {
        ...appMockRenderer.coreStart.actions,
        isCatalogEnabled: true,
      };
      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          connector={{ ...specConnector, specVersion: '2.1' }}
          onClose={onClose}
          tab={EditConnectorTabs.Test}
        />
      );

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalledWith(
        '/internal/actions/connector_types/spec-connector-test/spec',
        expect.objectContaining({ query: { spec_version: '2.1' } })
      );
    });
  });

  it('renders the test form for an opted-in spec connector without throwing', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
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

  it('hides the Test tab for a spec connector that has not opted in to testing', async () => {
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue(mockSpecResponse(false));

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('configureConnectorTab')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('testConnectorTab')).not.toBeInTheDocument();
    });
  });

  it('seeds the reserved _test subAction and hides action-params inputs for an opted-in spec connector', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
      />
    );

    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('executeActionButton'));

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
        '/api/actions/connector/spec-connector-id/_execute',
        {
          body: JSON.stringify({
            params: {
              subAction: TEST_CONNECTOR_SUB_ACTION,
              subActionParams: {},
            },
          }),
        }
      );
    });
  });

  it('shows loading state on the Test tab while fetching spec', async () => {
    let resolveSpec: (value: ReturnType<typeof mockSpecResponse>) => void;
    const specPromise = new Promise<ReturnType<typeof mockSpecResponse>>((resolve) => {
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
      />
    );

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.get).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('test-connector-form')).not.toBeInTheDocument();

    resolveSpec!(mockSpecResponse(true));

    expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
  });

  it('shows error state on the Test tab when spec fetch fails and retries', async () => {
    const errorMessage = 'Failed to fetch spec';
    appMockRenderer.coreStart.http.get = jest
      .fn()
      .mockRejectedValueOnce(new Error(errorMessage))
      .mockResolvedValueOnce(mockSpecResponse(true));

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={specConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
        tab={EditConnectorTabs.Test}
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

describe('stack connector edit flyout — embedder path (no connector-types fetch)', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();
  const actionTypeRegistry = actionTypeRegistryMock.create();

  const stackConnector = createMockActionConnector({
    id: 'stack-connector-id',
    name: 'Stack Connector',
    actionTypeId: '.test',
    config: {},
    secrets: {},
  });

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
  });

  it('shows the test tab for a stack connector without fetching connector types', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        connector={stackConnector}
        onClose={onClose}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('testConnectorTab')).toBeInTheDocument();
    expect(appMockRenderer.coreStart.http.get).not.toHaveBeenCalledWith(
      expect.stringContaining('/internal/actions/connector_types')
    );
  });
});
