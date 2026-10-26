/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';

import userEvent from '@testing-library/user-event';
import { waitFor, act, screen } from '@testing-library/react';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import EditConnectorFlyout from '.';
import type { ActionConnector, GenericValidationResult } from '../../../../types';
import { EditConnectorTabs } from '../../../../types';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import { TECH_PREVIEW_LABEL } from '../../translations';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    connectorTypeIsDual: jest.fn((id: string) => id === '.dual'),
    connectorTypeIsInboundOnly: jest.fn((id: string) => id === '.inboundWebhook'),
    connectorTypeHasInboundEvents: jest.fn(
      (id: string) =>
        id === '.dual' || id === '.inboundWebhook' || actual.connectorTypeHasInboundEvents(id)
    ),
  };
});

jest.setTimeout(15_000);

const updateConnectorResponse = {
  connector_type_id: 'test',
  is_preconfigured: false,
  is_deprecated: false,
  name: 'My test',
  config: { testTextField: 'My text field' },
  secrets: {},
  id: '123',
};

const executeConnectorResponse = {
  status: 'ok',
  data: {},
};

const connector: ActionConnector = createMockActionConnector({
  id: '123',
  name: 'My test',
  actionTypeId: '.test',
  config: { testTextField: 'My text field' },
  secrets: { secretTextField: 'super secret' },
  authMode: 'shared',
});

describe('EditConnectorFlyout', () => {
  let appMockRenderer: AppMockRenderer;
  const onClose = jest.fn();
  const onConnectorUpdated = jest.fn();

  const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
    actionConnectorFields: lazy(() => import('../connector_mock')),
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
  });

  const actionTypeRegistry = actionTypeRegistryMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: true, show: true, execute: true },
    };
    appMockRenderer.coreStart.http.get = jest.fn().mockResolvedValue([
      {
        id: '.test',
        name: 'Test',
        enabled: true,
        enabled_in_config: true,
        enabled_in_license: true,
        supported_feature_ids: [],
        minimum_license_required: 'basic',
        is_system_action_type: false,
        is_deprecated: false,
      },
    ]);
    appMockRenderer.coreStart.http.put = jest.fn().mockResolvedValue(updateConnectorResponse);
    appMockRenderer.coreStart.http.post = jest.fn().mockResolvedValue(executeConnectorResponse);
  });

  it('renders', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByTestId('edit-connector-flyout')).toBeInTheDocument();
    expect(getByTestId('edit-connector-flyout-header')).toBeInTheDocument();
    expect(getByTestId('edit-connector-flyout-footer')).toBeInTheDocument();
  });

  it('enables save button when the form is modified', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );
    expect(await screen.findByTestId('edit-connector-flyout-save-btn')).toBeDisabled();

    await act(async () => {
      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name', {
        delay: 10,
      });
    });

    expect(getByTestId('edit-connector-flyout-save-btn')).not.toBeDisabled();
  });

  it('shows a confirmation modal on close if the form is modified', async () => {
    const { getByTestId, getByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );
    expect(await screen.findByTestId('edit-connector-flyout-save-btn')).toBeDisabled();

    await userEvent.clear(getByTestId('nameInput'));
    await userEvent.type(getByTestId('nameInput'), 'My new name', {
      delay: 10,
    });

    await userEvent.click(getByTestId('edit-connector-flyout-close-btn'));

    expect(getByText('Discard unsaved changes to connector?')).toBeInTheDocument();
  });

  it('renders the connector form correctly', async () => {
    const { getByTestId, queryByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();
    expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();

    await waitFor(() => {
      expect(queryByText('This connector is read-only.')).not.toBeInTheDocument();
      expect(getByTestId('nameInput')).toHaveValue('My test');
      expect(getByTestId('test-connector-text-field')).toHaveValue('My text field');
    });
  });

  it('removes the secrets from the connector', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('test-connector-secret-text-field')).toBeInTheDocument();

    expect(getByTestId('test-connector-secret-text-field')).toHaveValue('');
  });

  it('renders correctly if the connector is preconfigured', async () => {
    const { getByText } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={{ ...connector, isPreconfigured: true }}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(getByText('This connector is read-only.')).toBeInTheDocument();
  });

  it('shows the buttons', async () => {
    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('edit-connector-flyout-save-btn')).toBeInTheDocument();
    expect(await screen.findByTestId('edit-connector-flyout-close-btn')).toBeInTheDocument();
  });

  it('does not show the save button if the use does not have permissions to update connector', async () => {
    appMockRenderer.coreStart.application.capabilities = {
      ...appMockRenderer.coreStart.application.capabilities,
      actions: { save: false, show: true },
    };

    const { queryByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
  });

  it('does not show the save button if the connector is preconfigured', async () => {
    const { queryByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={{ ...connector, isPreconfigured: true }}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(queryByTestId('edit-connector-flyout-save-btn')).not.toBeInTheDocument();
  });

  it('shows the webhook URL and rotate control for an inbound webhook connector', async () => {
    const inboundConnector = createMockActionConnector({
      id: 'sales-ingress',
      name: 'Sales ingress',
      actionTypeId: '.inboundWebhook',
      config: { ingestTokenHash: 'a'.repeat(64) },
      secrets: {},
    });
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={inboundConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('inbound-ingress-credentials')).toBeInTheDocument();
    expect(screen.getByTestId('inbound-ingress-webhook-url')).toBeInTheDocument();
    expect(screen.getByTestId('inbound-ingress-rotate-btn')).toBeInTheDocument();
    expect(screen.getByTestId('inbound-ingress-token-hidden')).toBeInTheDocument();
    expect(screen.queryByTestId('inbound-events-enabled-switch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('connector-outbound-label')).not.toBeInTheDocument();
  });

  it('hides inbound webhook credentials when the cluster flag is off', async () => {
    const inboundConnector = createMockActionConnector({
      id: 'sales-ingress',
      name: 'Sales ingress',
      actionTypeId: '.inboundWebhook',
      config: { ingestTokenHash: 'a'.repeat(64) },
      secrets: {},
    });
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = false;

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={inboundConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('nameInput')).toBeInTheDocument();
    expect(screen.queryByTestId('inbound-ingress-credentials')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbound-ingress-webhook-url')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbound-ingress-rotate-btn')).not.toBeInTheDocument();
  });

  it('shows the receive-events switch off for a dual connector', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: false,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('inbound-events-enabled-switch')).not.toBeChecked();
    expect(screen.getByTestId('connector-inbound-label')).toBeInTheDocument();
    expect(screen.getByTestId('connector-outbound-label')).toBeInTheDocument();
    expect(screen.queryByTestId('inbound-ingress-credentials')).not.toBeInTheDocument();
    expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();
  });

  it('warns when turning off inbound events on a live dual connector', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: true,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('inbound-ingress-credentials')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('inbound-events-enabled-switch'));
    expect(screen.getByTestId('inbound-events-disable-warning')).toHaveTextContent('After save,');
  });

  it('hides inbound on a dual connector when the cluster flag is off', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: true,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = false;

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();
    expect(screen.queryByTestId('inbound-events-enabled-switch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inbound-ingress-credentials')).not.toBeInTheDocument();
    expect(screen.getByTestId('connector-outbound-label')).toBeInTheDocument();
  });

  it('rotates once after enabling inbound events on a dual connector', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: false,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
    appMockRenderer.coreStart.http.put = jest
      .fn()
      .mockImplementation((_path: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ...updateConnectorResponse,
          id: 'dd-1',
          name: body.name,
          config: body.config,
          connector_type_id: '.dual',
          is_inbound_events_enabled: body.is_inbound_events_enabled === true,
        });
      });
    appMockRenderer.coreStart.http.post = jest.fn().mockImplementation((path: string) => {
      if (String(path).includes('_rotate_event_token')) {
        return Promise.resolve({ ingest_token: 'once-token' });
      }
      return Promise.resolve(executeConnectorResponse);
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('inbound-events-enabled-switch')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('inbound-events-enabled-switch'));
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
        expect.stringContaining('/connector/dd-1'),
        expect.objectContaining({
          body: expect.stringContaining('"is_inbound_events_enabled":true'),
        })
      );
    });
    expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
      expect.stringContaining('_rotate_event_token')
    );
    expect(await screen.findByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
    expect(screen.queryByTestId('inbound-events-save-to-generate')).not.toBeInTheDocument();
    expect(onConnectorUpdated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('edit-connector-flyout-close-btn'));

    expect(onConnectorUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        isInboundEventsEnabled: true,
        secrets: { ingestToken: 'once-token' },
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('updates the header name after enabling inbound events and renaming without closing', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: false,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
    appMockRenderer.coreStart.http.put = jest
      .fn()
      .mockImplementation((_path: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ...updateConnectorResponse,
          id: 'dd-1',
          name: body.name,
          config: body.config,
          connector_type_id: '.dual',
          is_inbound_events_enabled: body.is_inbound_events_enabled === true,
        });
      });
    appMockRenderer.coreStart.http.post = jest.fn().mockImplementation((path: string) => {
      if (String(path).includes('_rotate_event_token')) {
        return Promise.resolve({ ingest_token: 'once-token' });
      }
      return Promise.resolve(executeConnectorResponse);
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('edit-connector-flyout-header-name')).toHaveTextContent(
      'Datadog'
    );
    await userEvent.click(screen.getByTestId('inbound-events-enabled-switch'));
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
    expect(await screen.findByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
    expect(onConnectorUpdated).not.toHaveBeenCalled();

    const nameInput = screen.getByTestId('nameInput');
    await userEvent.clear(nameInput);
    await userEvent.click(nameInput);
    await userEvent.paste('Renamed dual');
    await waitFor(() => {
      expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeEnabled();
    });
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-connector-flyout-header-name')).toHaveTextContent(
        'Renamed dual'
      );
    });
    expect(screen.getByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
    expect(onConnectorUpdated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('publishes the token from a later manual rotate when the flyout closes', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: false,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
    appMockRenderer.coreStart.http.put = jest
      .fn()
      .mockImplementation((_path: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ...updateConnectorResponse,
          id: 'dd-1',
          name: body.name,
          config: body.config,
          connector_type_id: '.dual',
          is_inbound_events_enabled: body.is_inbound_events_enabled === true,
        });
      });
    let rotateCount = 0;
    appMockRenderer.coreStart.http.post = jest.fn().mockImplementation((path: string) => {
      if (String(path).includes('_rotate_event_token')) {
        rotateCount += 1;
        return Promise.resolve({
          ingest_token: rotateCount === 1 ? 'once-token' : 'rotated-token',
        });
      }
      return Promise.resolve(executeConnectorResponse);
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await userEvent.click(await screen.findByTestId('inbound-events-enabled-switch'));
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
    expect(await screen.findByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');

    await userEvent.click(screen.getByTestId('inbound-ingress-rotate-btn'));
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    await waitFor(() => {
      expect(screen.getByTestId('inbound-ingress-ingest-token')).toHaveValue('rotated-token');
    });

    await userEvent.click(screen.getByTestId('edit-connector-flyout-close-btn'));

    expect(onConnectorUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        isInboundEventsEnabled: true,
        secrets: { ingestToken: 'rotated-token' },
      })
    );
  });

  it('warns when inbound events are turned off after enabling them in the same session', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: false,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
    appMockRenderer.coreStart.http.put = jest
      .fn()
      .mockImplementation((_path: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ...updateConnectorResponse,
          id: 'dd-1',
          name: body.name,
          config: body.config,
          connector_type_id: '.dual',
          is_inbound_events_enabled: body.is_inbound_events_enabled === true,
        });
      });
    appMockRenderer.coreStart.http.post = jest.fn().mockImplementation((path: string) => {
      if (String(path).includes('_rotate_event_token')) {
        return Promise.resolve({ ingest_token: 'once-token' });
      }
      return Promise.resolve(executeConnectorResponse);
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    await userEvent.click(await screen.findByTestId('inbound-events-enabled-switch'));
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
    expect(await screen.findByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
    expect(screen.queryByTestId('inbound-events-disable-warning')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('inbound-events-enabled-switch'));

    expect(screen.getByTestId('inbound-events-disable-warning')).toHaveTextContent('After save,');
    await waitFor(() => {
      expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeEnabled();
    });
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledTimes(2);
    });
    expect(appMockRenderer.coreStart.http.put).toHaveBeenLastCalledWith(
      expect.stringContaining('/connector/dd-1'),
      expect.objectContaining({
        body: expect.stringContaining('"is_inbound_events_enabled":false'),
      })
    );
    expect(onConnectorUpdated).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('edit-connector-flyout-close-btn'));
    expect(onConnectorUpdated).toHaveBeenCalledWith(
      expect.objectContaining({
        isInboundEventsEnabled: false,
      })
    );
    expect(onConnectorUpdated.mock.calls[0][0].secrets?.ingestToken).toBeUndefined();
  });

  it('rotates when inbound events are turned back on after a disable in the same flyout', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: true,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
    appMockRenderer.coreStart.http.put = jest
      .fn()
      .mockImplementation((_path: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ...updateConnectorResponse,
          id: 'dd-1',
          name: body.name,
          config: body.config,
          connector_type_id: '.dual',
          is_inbound_events_enabled: body.is_inbound_events_enabled === true,
        });
      });
    appMockRenderer.coreStart.http.post = jest.fn().mockImplementation((path: string) => {
      if (String(path).includes('_rotate_event_token')) {
        return Promise.resolve({ ingest_token: 'once-token' });
      }
      return Promise.resolve(executeConnectorResponse);
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('inbound-events-enabled-switch')).toBeChecked();
    await userEvent.click(screen.getByTestId('inbound-events-enabled-switch'));
    await waitFor(() => {
      expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeEnabled();
    });
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledTimes(1);
    });
    expect(appMockRenderer.coreStart.http.post).not.toHaveBeenCalledWith(
      expect.stringContaining('_rotate_event_token')
    );

    await userEvent.click(await screen.findByTestId('inbound-events-enabled-switch'));
    expect(await screen.findByTestId('inbound-events-save-to-generate')).toBeInTheDocument();
    expect(screen.queryByTestId('inbound-ingress-rotate-btn')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeEnabled();
    });
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
        expect.stringContaining('_rotate_event_token')
      );
    });
    expect(await screen.findByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps a token that arrived with the connector when a later edit is saved', async () => {
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: true,
      config: { testTextField: 'site' },
      secrets: { ingestToken: 'once-token' },
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams: (): Promise<GenericValidationResult<unknown>> =>
        Promise.resolve({ errors: {} }),
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
    appMockRenderer.coreStart.http.put = jest
      .fn()
      .mockImplementation((_path: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ...updateConnectorResponse,
          id: 'dd-1',
          name: body.name,
          config: body.config,
          connector_type_id: '.dual',
          is_inbound_events_enabled: body.is_inbound_events_enabled === true,
        });
      });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
    const nameInput = screen.getByTestId('nameInput');
    await userEvent.clear(nameInput);
    await userEvent.click(nameInput);
    await userEvent.paste('Renamed dual');
    await waitFor(() => {
      expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeEnabled();
    });
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(onConnectorUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Renamed dual',
          isInboundEventsEnabled: true,
          secrets: { ingestToken: 'once-token' },
        })
      );
    });
    expect(screen.getByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');
  });

  it('passes the saved connector config to the test tab', async () => {
    const validateParams = jest.fn().mockResolvedValue({ errors: {} });
    const dualConnector = createMockActionConnector({
      id: 'dd-1',
      name: 'Datadog',
      actionTypeId: '.dual',
      isInboundEventsEnabled: false,
      config: { testTextField: 'site' },
      secrets: {},
    });
    const dualActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: '.dual',
      actionConnectorFields: lazy(() => import('../connector_mock')),
      validateParams,
    });
    actionTypeRegistry.get.mockReturnValue(dualActionTypeModel);
    appMockRenderer.coreStart.actions.isInboundEventsEnabled = true;
    appMockRenderer.coreStart.http.put = jest
      .fn()
      .mockImplementation((_path: string, opts?: { body?: string }) => {
        const body = opts?.body ? JSON.parse(opts.body) : {};
        return Promise.resolve({
          ...updateConnectorResponse,
          id: 'dd-1',
          name: body.name,
          config: body.config,
          connector_type_id: '.dual',
          is_inbound_events_enabled: body.is_inbound_events_enabled === true,
        });
      });
    appMockRenderer.coreStart.http.post = jest.fn().mockImplementation((path: string) => {
      if (String(path).includes('_rotate_event_token')) {
        return Promise.resolve({ ingest_token: 'once-token' });
      }
      return Promise.resolve(executeConnectorResponse);
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={dualConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    const configInput = await screen.findByTestId('test-connector-text-field');
    await userEvent.clear(configInput);
    await userEvent.click(configInput);
    await userEvent.paste('updated-site');
    await userEvent.click(screen.getByTestId('inbound-events-enabled-switch'));
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
    expect(await screen.findByTestId('inbound-ingress-ingest-token')).toHaveValue('once-token');

    await userEvent.click(screen.getByTestId('testConnectorTab'));

    await waitFor(() => {
      expect(validateParams).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ testTextField: 'updated-site' })
      );
    });
  });

  it('does not rotate when saving an inbound webhook connector', async () => {
    const inboundConnector = createMockActionConnector({
      id: 'sales-ingress',
      name: 'Sales ingress',
      actionTypeId: '.inboundWebhook',
      config: { ingestTokenHash: 'a'.repeat(64) },
      secrets: {},
    });

    appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={inboundConnector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    const nameInput = await screen.findByTestId('nameInput');
    await userEvent.clear(nameInput);
    await userEvent.click(nameInput);
    await userEvent.paste('Renamed ingress');
    await waitFor(() => {
      expect(screen.getByTestId('edit-connector-flyout-save-btn')).toBeEnabled();
    });
    await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(onConnectorUpdated).toHaveBeenCalled();
    });
    expect(appMockRenderer.coreStart.http.post).not.toHaveBeenCalledWith(
      expect.stringContaining('_rotate_event_token')
    );
  });

  it('disables the buttons when there are error on the form', async () => {
    const { getByTestId } = appMockRenderer.render(
      <EditConnectorFlyout
        actionTypeRegistry={actionTypeRegistry}
        onClose={onClose}
        connector={connector}
        onConnectorUpdated={onConnectorUpdated}
      />
    );

    expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();

    /**
     * Clear the name so the form can be invalid
     */
    await userEvent.clear(getByTestId('nameInput'));
    await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

    await waitFor(() => {
      expect(getByTestId('edit-connector-flyout-close-btn')).not.toBeDisabled();
      expect(getByTestId('edit-connector-flyout-save-btn')).toBeDisabled();
    });
  });

  describe('Header', () => {
    it('shows the icon', async () => {
      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('edit-connector-flyout-header-icon')).toBeInTheDocument();
    });

    it('does not shows the icon when is not defined', async () => {
      // @ts-expect-error
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, iconClass: undefined });
      const { queryByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(queryByTestId('edit-connector-flyout-header-icon')).not.toBeInTheDocument();
    });

    it('shows the correct title', async () => {
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByText('Edit connector')).toBeInTheDocument();
    });

    it('shows the correct on preconfigured connectors', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('preconfiguredBadge')).toBeInTheDocument();
    });

    it('does not show `tech preview` badge when isExperimental is false', async () => {
      const { queryByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(queryByText(TECH_PREVIEW_LABEL)).not.toBeInTheDocument();
    });

    it('shows `tech preview` badge when isExperimental is true', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: true });
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(getByText(TECH_PREVIEW_LABEL)).toBeInTheDocument();
    });

    it('does not show `Technical Preview` badge when `isExperimental` is `false`', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: false });
      const { queryByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(queryByText(TECH_PREVIEW_LABEL)).not.toBeInTheDocument();
    });

    it('shows `Technical Preview` badge when `isExperimental` is `true`', async () => {
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, isExperimental: true });
      const { getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={{ ...connector, isPreconfigured: true }}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(getByText(TECH_PREVIEW_LABEL)).toBeInTheDocument();
    });

    it('does not show a docs link when the connector type has no docsUrl', async () => {
      const { queryByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(queryByTestId('edit-connector-flyout-header-docs-link')).not.toBeInTheDocument();
    });

    it('shows a docs link when the connector type has a docsUrl', async () => {
      const connectorDocsUrl =
        'https://www.elastic.co/docs/reference/kibana/connectors-kibana/test-action-type';
      actionTypeRegistry.get.mockReturnValue({ ...actionTypeModel, docsUrl: connectorDocsUrl });
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );
      await act(() => Promise.resolve());
      expect(getByTestId('edit-connector-flyout-header-docs-link')).toHaveAttribute(
        'href',
        connectorDocsUrl
      );
    });
  });

  describe('Tabs', () => {
    it('shows the tabs', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
      expect(await screen.findByTestId('testConnectorTab')).toBeInTheDocument();
    });

    it('navigates to the test form', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
      expect(await screen.findByTestId('testConnectorTab')).toBeInTheDocument();

      await userEvent.click(getByTestId('testConnectorTab'));

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
    });

    it('opens the provided tab', async () => {
      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();
    });
  });

  describe('Submitting', () => {
    it('updates the connector correctly', async () => {
      const { getByTestId, queryByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name');
      await userEvent.type(getByTestId('test-connector-secret-text-field'), 'password');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
        expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');
      });

      await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My new name","config":{"testTextField":"My text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      expect(onClose).not.toHaveBeenCalled();
      expect(onConnectorUpdated).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
      expect(queryByTestId('connector-form-header-error-label')).not.toBeInTheDocument();
    });

    it('updates connector form field with latest value', async () => {
      // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();

      await user.clear(getByTestId('test-connector-text-field'));
      await user.type(getByTestId('test-connector-text-field'), 'My updated text field');

      expect(getByTestId('test-connector-text-field')).toHaveValue('My updated text field');

      await user.clear(getByTestId('nameInput'));
      await user.type(getByTestId('nameInput'), 'My test');
      await user.type(getByTestId('test-connector-secret-text-field'), 'password');

      expect(getByTestId('nameInput')).toHaveValue('My test');
      expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');

      await user.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My test","config":{"testTextField":"My updated text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      // Unsure why this is failing and has the old value "My text field again".
      // after the userEvent update to v14 in https://github.com/elastic/kibana/pull/189949.
      // As a fallback the above check was added to ensure the correct value is still being sent.
      // expect(getByTestId('test-connector-text-field')).toHaveValue('My updated text field');
    });

    it('updates the connector and close the flyout correctly', async () => {
      const { getByTestId, getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name');
      await userEvent.type(getByTestId('test-connector-secret-text-field'), 'password');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
        expect(getByTestId('test-connector-secret-text-field')).toHaveValue('password');
      });

      await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.put).toHaveBeenCalledWith(
          '/api/actions/connector/123',
          {
            body: '{"name":"My new name","config":{"testTextField":"My text field"},"secrets":{"secretTextField":"password"}}',
          }
        );
      });

      expect(getByText('Changes Saved')).toBeInTheDocument();

      await userEvent.click(getByTestId('edit-connector-flyout-close-btn'));

      expect(onClose).toHaveBeenCalled();
      expect(onConnectorUpdated).toHaveBeenCalledWith({
        actionTypeId: 'test',
        config: { testTextField: 'My text field' },
        id: '123',
        isDeprecated: false,
        isMissingSecrets: undefined,
        isPreconfigured: false,
        name: 'My test',
        secrets: {},
      });
    });

    it('show error message in the form header', async () => {
      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('test-connector-text-field')).toBeInTheDocument();
      await userEvent.clear(screen.getByTestId('nameInput'));
      await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
      expect(await screen.findByTestId('connector-form-header-error-label')).toBeInTheDocument();
    });

    it('removes error message from the form header', async () => {
      appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(await screen.findByTestId('nameInput')).toBeInTheDocument();

      await userEvent.clear(screen.getByTestId('nameInput'));
      await userEvent.type(screen.getByTestId('nameInput'), 'My new name');
      await userEvent.type(screen.getByTestId('test-connector-secret-text-field'), 'password');
      await userEvent.click(screen.getByTestId('edit-connector-flyout-save-btn'));
      expect(screen.queryByTestId('connector-form-header-error-label')).not.toBeInTheDocument();
    });

    it('runs pre submit validator correctly', async () => {
      const errorActionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
        actionConnectorFields: lazy(() => import('../connector_error_mock')),
      });
      actionTypeRegistry.get.mockReturnValue(errorActionTypeModel);

      const { getByTestId, getByText } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          onConnectorUpdated={onConnectorUpdated}
          connector={connector}
        />
      );

      expect(await screen.findByTestId('test-connector-error-text-field')).toBeInTheDocument();

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name');

      await waitFor(() => {
        expect(getByTestId('nameInput')).toHaveValue('My new name');
      });

      await userEvent.click(getByTestId('edit-connector-flyout-save-btn'));

      await waitFor(() => {
        expect(getByText('Error on pre submit validator')).toBeInTheDocument();
      });
    });
  });

  describe('Testing', () => {
    it('tests the connector correctly', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();

      await userEvent.click(getByTestId('executeActionButton'));

      await waitFor(() => {
        expect(appMockRenderer.coreStart.http.post).toHaveBeenCalledWith(
          '/api/actions/connector/123/_execute',
          { body: '{"params":{}}' }
        );
      });

      expect(getByTestId('executionSuccessfulResult')).toBeInTheDocument();
    });

    it('resets the results when changing tabs', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();

      await userEvent.click(getByTestId('executeActionButton'));

      expect(await screen.findByTestId('executionSuccessfulResult')).toBeInTheDocument();

      await userEvent.click(getByTestId('configureConnectorTab'));

      expect(await screen.findByTestId('nameInput')).toBeInTheDocument();

      await userEvent.click(getByTestId('testConnectorTab'));

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();
    });

    it('throws an error correctly', async () => {
      appMockRenderer.coreStart.http.post = jest
        .fn()
        .mockRejectedValue(new Error('error executing'));

      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

      await userEvent.click(getByTestId('executeActionButton'));

      expect(await screen.findByTestId('executionFailureResult')).toBeInTheDocument();
    });

    it('resets the results when modifying the form', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
          tab={EditConnectorTabs.Test}
        />
      );

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

      await userEvent.click(getByTestId('executeActionButton'));

      expect(await screen.findByTestId('executionSuccessfulResult')).toBeInTheDocument();

      await userEvent.click(getByTestId('configureConnectorTab'));

      expect(await screen.findByTestId('nameInput')).toBeInTheDocument();

      await userEvent.clear(getByTestId('nameInput'));
      await userEvent.type(getByTestId('nameInput'), 'My new name', {
        delay: 10,
      });

      await userEvent.click(getByTestId('testConnectorTab'));

      expect(await screen.findByTestId('test-connector-form')).toBeInTheDocument();

      expect(getByTestId('executionAwaiting')).toBeInTheDocument();
      expect(getByTestId('executeActionButton')).toBeDisabled();
    });

    it('should not disable the test tab', async () => {
      const { getByTestId } = appMockRenderer.render(
        <EditConnectorFlyout
          actionTypeRegistry={actionTypeRegistry}
          onClose={onClose}
          connector={connector}
          onConnectorUpdated={onConnectorUpdated}
        />
      );

      expect(getByTestId('configureConnectorTab')).toBeInTheDocument();
      expect(await screen.findByTestId('testConnectorTab')).toBeEnabled();
    });
  });
});
