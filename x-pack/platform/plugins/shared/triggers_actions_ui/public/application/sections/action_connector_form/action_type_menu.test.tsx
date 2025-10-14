/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionTypeMenu } from './action_type_menu';
import { GenericValidationResult } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import type { AppMockRenderer } from '../test_utils';
import { createAppMockRenderer } from '../test_utils';

jest.mock('../../../common/lib/kibana');

jest.mock('../../lib/action_connector_api', () => ({
  ...(jest.requireActual('../../lib/action_connector_api') as any),
  loadActionTypes: jest.fn(),
}));
const { loadActionTypes } = jest.requireMock('../../lib/action_connector_api');

const actionTypeRegistry = actionTypeRegistryMock.create();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('connector_add_flyout', () => {
  let appMockRenderer: AppMockRenderer;
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
  });

  afterEach(() => {
    actionTypeRegistry.get.mockReset();
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders action type menu with proper EuiCards for registered action types', async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValue(actionType);
      loadActionTypes.mockResolvedValue([
        {
          id: actionType.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(await screen.findByTestId('my-action-type-card')).toBeInTheDocument();
    });

    it(`doesn't renders action types that are disabled via config`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValueOnce(actionType);
      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: false,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(screen.queryByTestId('my-action-type-card')).not.toBeInTheDocument();
    });

    it(`renders action types as disabled when disabled by license`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValue(actionType);
      loadActionTypes.mockResolvedValue([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(await screen.findByTestId('my-action-type-card')).toBeInTheDocument();
    });

    it('renders action type based on hideInUi flag', async () => {
      const onActionTypeChange = jest.fn();
      const actionType1 = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type-1',
        iconClass: 'test',
        selectMessage: 'test 1',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        getHideInUi: () => true,
        actionConnectorFields: null,
      });
      const actionType2 = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type-2',
        iconClass: 'test',
        selectMessage: 'test 2',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        getHideInUi: () => false,
        actionConnectorFields: null,
      });

      // mock get return for filter
      actionTypeRegistry.get.mockReturnValueOnce(actionType1);
      actionTypeRegistry.get.mockReturnValueOnce(actionType2);
      // mock get return for map
      actionTypeRegistry.get.mockReturnValueOnce(actionType1);
      actionTypeRegistry.get.mockReturnValueOnce(actionType2);

      loadActionTypes.mockResolvedValueOnce([
        {
          id: actionType1.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
        {
          id: actionType2.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(screen.queryByTestId('my-action-type-1-card')).not.toBeInTheDocument();
      expect(await screen.findByTestId('my-action-type-2-card')).toBeInTheDocument();
    });
  });

  describe('beta badge', () => {
    it(`does not render beta badge when isExperimental=undefined`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      actionTypeRegistry.get.mockReturnValue(actionType);
      loadActionTypes.mockResolvedValue([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(screen.queryByTestId('my-action-type-card')).not.toBeInTheDocument();
    });
    it(`does not render beta badge when isExperimental=false`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
        isExperimental: false,
      });
      actionTypeRegistry.get.mockReturnValue(actionType);
      loadActionTypes.mockResolvedValue([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(screen.queryByTestId('my-action-type-card')).not.toBeInTheDocument();
    });

    it(`renders beta badge when isExperimental=true`, async () => {
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
        isExperimental: true,
      });
      actionTypeRegistry.get.mockReturnValue(actionType);
      loadActionTypes.mockResolvedValue([
        {
          id: actionType.id,
          enabled: false,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: false,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(screen.queryByTestId('my-action-type-card')).not.toBeInTheDocument();
    });
  });
});
