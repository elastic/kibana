/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { screen } from '@testing-library/react';
import ConnectorAddModal from './connector_add_modal';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import type { ActionType, GenericValidationResult } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { coreMock } from '@kbn/core/public/mocks';
import type { AppMockRenderer } from '../test_utils';
import { createAppMockRenderer } from '../test_utils';
import { createMockConnectorType } from '@kbn/actions-plugin/server/application/connector/mocks';

jest.mock('../../../common/lib/kibana');
jest.mock('../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../lib/action_connector_api') as any),
  loadActionTypes: jest.fn(),
}));

const { loadActionTypes } = jest.requireMock('../../lib/action_connector_api');
const actionTypeRegistry = actionTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('connector_add_modal', () => {
  let appMockRenderer: AppMockRenderer;
  const actionType: ActionType = createMockConnectorType({
    id: 'my-action-type',
    name: 'test',
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: ['alerting'],
  });

  beforeAll(async () => {
    appMockRenderer = createAppMockRenderer();
    const mockes = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mockes.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      actions: {
        show: true,
        save: true,
        delete: true,
      },
    };
    loadActionTypes.mockResolvedValue([actionType]);
  });

  it('renders connector modal form if addModalVisible is true', async () => {
    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'my-action-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
    });
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);

    appMockRenderer.render(
      <ConnectorAddModal
        onClose={() => {}}
        actionType={actionType}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    expect(await screen.findByTestId('saveActionButtonModal')).toBeInTheDocument();
  });

  it('filters out sub type connector when disabled in config', async () => {
    const newActionType: ActionType = {
      id: 'my-action-type-1',
      name: 'Test 1',
      enabled: false,
      enabledInConfig: false,
      enabledInLicense: true,
      isDeprecated: false,
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      isSystemActionType: false,
    };

    loadActionTypes.mockResolvedValue([actionType, newActionType]);

    const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'my-action-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
      subtype: [
        { id: 'my-action-type', name: 'Test' },
        { id: 'my-action-type-1', name: 'Test 1' },
      ],
    });
    actionTypeRegistry.get.mockReturnValue(actionTypeModel);
    actionTypeRegistry.has.mockReturnValue(true);

    appMockRenderer.render(
      <ConnectorAddModal
        onClose={() => {}}
        actionType={actionType}
        actionTypeRegistry={actionTypeRegistry}
      />
    );

    expect(await screen.findByText('test connector')).toBeInTheDocument();
    expect(screen.queryByText('test 1 connector')).not.toBeInTheDocument();

    expect(screen.queryByTestId('my-action-type-1Button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-action-typeButton')).not.toBeInTheDocument();
  });

  describe('beta badge', () => {
    it(`does not render beta badge when isExperimental=false`, async () => {
      const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        isExperimental: false,
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValue(actionTypeModel);
      actionTypeRegistry.has.mockReturnValue(true);

      appMockRenderer.render(
        <ConnectorAddModal
          onClose={() => {}}
          actionType={actionType}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(screen.queryByTestId('betaBadge')).not.toBeInTheDocument();
    });

    it(`renders beta badge when isExperimental=true`, async () => {
      const actionTypeModel = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        isExperimental: true,
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValue(actionTypeModel);
      actionTypeRegistry.has.mockReturnValue(true);
      appMockRenderer.render(
        <ConnectorAddModal
          onClose={() => {}}
          actionType={actionType}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(await screen.findByTestId('betaBadge')).toBeInTheDocument();
    });
  });
});
