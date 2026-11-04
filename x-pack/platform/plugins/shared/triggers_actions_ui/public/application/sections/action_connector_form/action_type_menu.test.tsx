/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { act, screen } from '@testing-library/react';

// Jest resolves @elastic/eui to test-env, whose EuiIcon ignores component types.
// Production EuiIcon renders them, so a lazy icon suspends. Mirror that here.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const ReactActual = jest.requireActual('react');

  const EuiIcon = ({
    type,
    className,
    ...rest
  }: {
    type?: unknown;
    className?: string;
    [key: string]: unknown;
  }) => {
    const classes = ['euiIcon', className].filter(Boolean).join(' ');
    if (typeof type === 'string' || type == null) {
      return ReactActual.createElement('span', {
        ...rest,
        className: classes,
        'data-euiicon-type': type,
      });
    }
    return ReactActual.createElement(type as React.ElementType, { ...rest, className: classes });
  };

  return {
    ...actual,
    EuiIcon,
  };
});
import { coreMock } from '@kbn/core/public/mocks';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import { ActionTypeMenu } from './action_type_menu';
import type { GenericValidationResult } from '../../../types';
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

    it('renders cards immediately when icons are lazy', async () => {
      let resolveIcon: (value: { default: React.FC<React.SVGProps<SVGSVGElement>> }) => void =
        () => undefined;
      const deferred = new Promise<{ default: React.FC<React.SVGProps<SVGSVGElement>> }>(
        (resolve) => {
          resolveIcon = resolve;
        }
      );
      const ResolvedIcon = (props: React.SVGProps<SVGSVGElement>) => (
        <svg {...props} data-test-subj="resolved-connector-icon" />
      );
      const onActionTypeChange = jest.fn();
      const actionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-action-type',
        iconClass: lazy(() => deferred),
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
        <Suspense fallback={<div data-test-subj="outer-fallback" />}>
          <ActionTypeMenu
            onActionTypeChange={onActionTypeChange}
            actionTypeRegistry={actionTypeRegistry}
          />
        </Suspense>
      );

      const card = await screen.findByTestId('my-action-type-card');
      expect(screen.queryByTestId('sectionLoading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
      expect(screen.queryByTestId('resolved-connector-icon')).not.toBeInTheDocument();

      await act(async () => {
        resolveIcon({ default: ResolvedIcon });
      });

      expect(await screen.findByTestId('resolved-connector-icon')).toBeInTheDocument();
      expect(screen.getByTestId('my-action-type-card')).toBe(card);
      expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
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

  describe('filtering', () => {
    const onActionTypeChange = jest.fn();

    const actionType1 = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'action-type-1',
      iconClass: 'test',
      selectMessage: 'Select Test1',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
    });

    const actionType2 = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'action-type-2',
      iconClass: 'test',
      selectMessage: 'Select Test2',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Filters connectors based on name search', async () => {
      loadActionTypes.mockResolvedValue([
        {
          id: actionType1.id,
          enabled: true,
          name: 'Jira',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        {
          id: actionType2.id,
          enabled: true,
          name: 'Webhook',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['cases'],
        },
      ]);

      actionTypeRegistry.get.mockImplementation((id) =>
        id === actionType1.id ? actionType1 : actionType2
      );

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
          searchValue="Jira"
        />
      );

      expect(await screen.findByTestId('action-type-1-card')).toBeInTheDocument();
      expect(screen.queryByTestId('action-type-2-card')).not.toBeInTheDocument();
    });

    it('Filters connectors based on selected feature ids', async () => {
      loadActionTypes.mockResolvedValue([
        {
          id: actionType1.id,
          enabled: true,
          name: 'Jira',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        {
          id: actionType2.id,
          enabled: true,
          name: 'Webhook',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['cases'],
        },
      ]);

      actionTypeRegistry.get.mockImplementation((id) =>
        id === actionType1.id ? actionType1 : actionType2
      );

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
          selectedFeatureIds={['cases']}
        />
      );

      expect(await screen.findByTestId('action-type-2-card')).toBeInTheDocument();
      expect(screen.queryByTestId('action-type-1-card')).not.toBeInTheDocument();
    });

    it('Filters connectors based on selectMessage search', async () => {
      loadActionTypes.mockResolvedValue([
        {
          id: actionType1.id,
          enabled: true,
          name: 'Jira',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
        },
        {
          id: actionType2.id,
          enabled: true,
          name: 'Webhook',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['cases'],
        },
      ]);

      actionTypeRegistry.get.mockImplementation((id) =>
        id === actionType1.id ? actionType1 : actionType2
      );

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
          searchValue="Select Test2"
        />
      );

      expect(await screen.findByTestId('action-type-2-card')).toBeInTheDocument();
      expect(screen.queryByTestId('action-type-1-card')).not.toBeInTheDocument();
    });
  });

  describe('spec connectors', () => {
    it('renders a spec connector using name and description from the server response', async () => {
      const onActionTypeChange = jest.fn();
      loadActionTypes.mockResolvedValue([
        {
          id: 'my-spec-connector',
          source: ACTION_TYPE_SOURCES.spec,
          enabled: true,
          name: 'My Spec Connector',
          description: 'Send data via spec connector',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isDeprecated: false,
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(await screen.findByTestId('my-spec-connector-card')).toBeInTheDocument();
      expect(screen.getByText('My Spec Connector')).toBeInTheDocument();
      expect(screen.getByText('Send data via spec connector')).toBeInTheDocument();
    });

    it('does not render a spec connector when enabledInConfig is false', async () => {
      const onActionTypeChange = jest.fn();
      loadActionTypes.mockResolvedValue([
        {
          id: 'my-spec-connector',
          source: ACTION_TYPE_SOURCES.spec,
          enabled: false,
          name: 'My Spec Connector',
          enabledInConfig: false,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isDeprecated: false,
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      await new Promise((r) => setTimeout(r, 0));
      expect(screen.queryByTestId('my-spec-connector-card')).not.toBeInTheDocument();
    });

    it('does not render a spec connector when workflows UI is disabled and connector only supports workflows', async () => {
      const onActionTypeChange = jest.fn();
      useKibanaMock().services.uiSettings.get = jest
        .fn()
        .mockImplementation((key: string) => (key === 'workflows:ui:enabled' ? false : undefined));
      loadActionTypes.mockResolvedValue([
        {
          id: 'my-workflows-connector',
          source: ACTION_TYPE_SOURCES.spec,
          enabled: true,
          name: 'My Workflows Connector',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['workflows'],
          isDeprecated: false,
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      await new Promise((r) => setTimeout(r, 0));
      expect(screen.queryByTestId('my-workflows-connector-card')).not.toBeInTheDocument();
    });
  });

  describe('deprecated connectors', () => {
    it('does not render a stack action type card when isDeprecated is true', async () => {
      const onActionTypeChange = jest.fn();
      const deprecatedActionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-deprecated-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });
      const activeActionType = actionTypeRegistryMock.createMockActionTypeModel({
        id: 'my-active-action-type',
        iconClass: 'test',
        selectMessage: 'test',
        validateParams: (): Promise<GenericValidationResult<unknown>> => {
          const validationResult = { errors: {} };
          return Promise.resolve(validationResult);
        },
        actionConnectorFields: null,
      });

      // mock get return for filter
      actionTypeRegistry.get.mockReturnValueOnce(deprecatedActionType);
      actionTypeRegistry.get.mockReturnValueOnce(activeActionType);
      // mock get return for map
      actionTypeRegistry.get.mockReturnValueOnce(deprecatedActionType);
      actionTypeRegistry.get.mockReturnValueOnce(activeActionType);

      loadActionTypes.mockResolvedValueOnce([
        {
          id: deprecatedActionType.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isDeprecated: true,
        },
        {
          id: activeActionType.id,
          enabled: true,
          name: 'Test',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isDeprecated: false,
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(await screen.findByTestId('my-active-action-type-card')).toBeInTheDocument();
      expect(screen.queryByTestId('my-deprecated-action-type-card')).not.toBeInTheDocument();
    });

    it('does not render a spec connector card when isDeprecated is true', async () => {
      const onActionTypeChange = jest.fn();
      loadActionTypes.mockResolvedValue([
        {
          id: 'my-deprecated-spec-connector',
          source: ACTION_TYPE_SOURCES.spec,
          enabled: true,
          name: 'My Deprecated Spec Connector',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isDeprecated: true,
        },
        {
          id: 'my-active-spec-connector',
          source: ACTION_TYPE_SOURCES.spec,
          enabled: true,
          name: 'My Active Spec Connector',
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isDeprecated: false,
        },
      ]);

      appMockRenderer.render(
        <ActionTypeMenu
          onActionTypeChange={onActionTypeChange}
          actionTypeRegistry={actionTypeRegistry}
        />
      );

      expect(await screen.findByTestId('my-active-spec-connector-card')).toBeInTheDocument();
      expect(screen.queryByTestId('my-deprecated-spec-connector-card')).not.toBeInTheDocument();
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
