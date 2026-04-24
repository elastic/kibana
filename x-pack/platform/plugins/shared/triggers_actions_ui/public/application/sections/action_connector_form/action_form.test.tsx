/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRuleAction } from '@kbn/alerting-plugin/common';
import {
  RecoveredActionGroup,
  isActionGroupDisabledForActionTypeId,
} from '@kbn/alerting-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React, { lazy } from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '../../../common/lib/kibana';
import type { GenericValidationResult, RuleUiAction, ValidationResult } from '../../../types';
import { actionTypeRegistryMock } from '../../action_type_registry.mock';
import ActionForm from './action_form';

jest.mock('../../../common/lib/kibana');
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemData }: any) => (
    <div>
      {Array.from({ length: itemCount }, (_, index) =>
        children({ index, style: {}, data: itemData })
      )}
    </div>
  ),
}));
jest.mock('../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
const { loadActionTypes, loadAllActions } = jest.requireMock('../../lib/action_connector_api');

const setHasActionsWithBrokenConnector = jest.fn();
describe('action_form', () => {
  const mockedActionParamsFields = lazy(async () => ({
    default() {
      return <></>;
    },
  }));

  const alertType = {
    id: 'my-alert-type',
    iconClass: 'test',
    name: 'test-alert',
    validate: (): ValidationResult => {
      return { errors: {} };
    },
    alertParamsExpression: () => <></>,
    requiresAppContext: false,
  };

  const actionType = {
    id: 'my-action-type',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
    actionTypeTitle: 'action-type-title',
  };

  const disabledByConfigActionType = {
    id: 'disabled-by-config',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const disabledByActionType = {
    id: '.jira',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const disabledByLicenseActionType = {
    id: 'disabled-by-license',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const preconfiguredOnly = {
    id: 'preconfigured',
    iconClass: 'test',
    selectMessage: 'test',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
  };

  const systemActionType = {
    id: 'my-system-action-type',
    iconClass: 'test',
    selectMessage: 'system action',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
    actionTypeTitle: 'system-action-type-title',
  };

  const workflowsSystemActionType = {
    id: '.workflows',
    iconClass: 'test',
    selectMessage: 'workflows system action',
    validateParams: (): Promise<GenericValidationResult<unknown>> => {
      const validationResult = { errors: {} };
      return Promise.resolve(validationResult);
    },
    actionConnectorFields: null,
    actionParamsFields: mockedActionParamsFields,
    actionTypeTitle: 'workflows-system-action-title',
  };

  const allActions = [
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test',
      actionTypeId: actionType.id,
      name: 'Test connector',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test2',
      actionTypeId: actionType.id,
      name: 'Test connector 2',
      config: {},
      isPreconfigured: true,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test3',
      actionTypeId: preconfiguredOnly.id,
      name: 'Preconfigured Only',
      config: {},
      isPreconfigured: true,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test4',
      actionTypeId: preconfiguredOnly.id,
      name: 'Regular connector',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: '.servicenow',
      actionTypeId: '.servicenow',
      name: 'Non consumer connector',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: '.jira',
      actionTypeId: disabledByActionType.id,
      name: 'Connector with disabled action group',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: null,
      isMissingSecrets: true,
      id: '.jira',
      actionTypeId: actionType.id,
      name: 'Connector with disabled action group',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
    },
    {
      secrets: {},
      isMissingSecrets: false,
      id: 'test',
      actionTypeId: systemActionType.id,
      name: 'Test system connector',
      config: {},
      isPreconfigured: false,
      isDeprecated: false,
      isSystemAction: true,
    },
  ];

  const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

  async function setup(
    customActions?: RuleUiAction[],
    customRecoveredActionGroup?: string,
    isExperimental?: boolean
  ) {
    const actionTypeRegistry = actionTypeRegistryMock.create();

    loadAllActions.mockResolvedValueOnce(allActions);
    const mocks = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      actions: {
        show: true,
        save: true,
        delete: true,
      },
    };
    const newActionType = {
      ...actionType,
      isExperimental,
    };

    actionTypeRegistry.list.mockReturnValue([
      newActionType,
      disabledByConfigActionType,
      disabledByLicenseActionType,
      disabledByActionType,
      preconfiguredOnly,
      systemActionType,
      workflowsSystemActionType,
    ]);

    actionTypeRegistry.has.mockReturnValue(true);
    actionTypeRegistry.get.mockReturnValue(newActionType);
    const initialAlert = {
      name: 'test',
      params: {},
      consumer: 'alerts',
      alertTypeId: alertType.id,
      schedule: {
        interval: '1m',
      },
      actions: (customActions
        ? customActions
        : [
            {
              group: 'default',
              id: 'test',
              actionTypeId: newActionType.id,
              params: {
                message: '',
              },
            },
          ]) as SanitizedRuleAction[],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
    };

    loadActionTypes.mockResolvedValue([
      {
        id: newActionType.id,
        name: 'Test',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: '.index',
        name: 'Index',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'preconfigured',
        name: 'Preconfigured only',
        enabled: true,
        enabledInConfig: false,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'disabled-by-config',
        name: 'Disabled by config',
        enabled: false,
        enabledInConfig: false,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'hidden-in-ui',
        name: 'Hidden in UI',
        enabled: false,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'disabled-by-license',
        name: 'Disabled by license',
        enabled: false,
        enabledInConfig: true,
        enabledInLicense: false,
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: '.jira',
        name: 'Disabled by action type',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
      {
        id: 'my-system-action-type',
        name: 'System action',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        isSystemActionType: true,
      },
      {
        id: '.workflows',
        name: 'Workflows',
        enabled: true,
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        isSystemActionType: true,
        allowMultipleSystemActions: true,
      },
    ]);

    const defaultActionMessage = 'Alert [{{context.metadata.name}}] has exceeded the threshold';
    const result = renderWithI18n(
      <QueryClientProvider client={new QueryClient()}>
        <ActionForm
          actions={initialAlert.actions}
          messageVariables={{
            params: [
              { name: 'testVar1', description: 'test var1' },
              { name: 'testVar2', description: 'test var2' },
            ],
            state: [],
            context: [{ name: 'contextVar', description: 'context var1' }],
          }}
          featureId="alerting"
          producerId="alerting"
          defaultActionGroupId={'default'}
          isActionGroupDisabledForActionType={(actionGroupId: string, actionTypeId: string) => {
            const recoveryActionGroupId = customRecoveredActionGroup
              ? customRecoveredActionGroup
              : 'recovered';
            return isActionGroupDisabledForActionTypeId(
              actionGroupId === recoveryActionGroupId ? RecoveredActionGroup.id : actionGroupId,
              actionTypeId
            );
          }}
          setActionIdByIndex={(id: string, index: number) => {
            initialAlert.actions[index].id = id;
          }}
          actionGroups={[
            { id: 'default', name: 'Default', defaultActionMessage },
            {
              id: customRecoveredActionGroup ? customRecoveredActionGroup : 'recovered',
              name: customRecoveredActionGroup ? 'I feel better' : 'Recovered',
            },
          ]}
          setActionGroupIdByIndex={(group: string, index: number) => {
            initialAlert.actions[index].group = group;
          }}
          setActions={(_updatedActions: RuleUiAction[]) => {}}
          setActionParamsProperty={(key: string, value: any, index: number) =>
            (initialAlert.actions[index] = { ...initialAlert.actions[index], [key]: value })
          }
          setActionFrequencyProperty={(key: string, value: any, index: number) =>
            (initialAlert.actions[index] = {
              ...initialAlert.actions[index],
              frequency: {
                ...initialAlert.actions[index].frequency!,
                [key]: value,
              },
            })
          }
          setActionAlertsFilterProperty={(key: string, value: any, index: number) =>
            (initialAlert.actions[index] = {
              ...initialAlert.actions[index],
              alertsFilter: {
                ...initialAlert.actions[index].alertsFilter,
                [key]: value,
              },
            })
          }
          actionTypeRegistry={actionTypeRegistry}
          setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
          ruleTypeId=".es-query"
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(loadAllActions).toHaveBeenCalled();
    });

    return result;
  }

  describe('action_form in alert', () => {
    it('renders available action cards', async () => {
      await setup();
      await screen.findByTestId(`${actionType.id}-alerting-ActionTypeSelectOption`);

      expect(setHasActionsWithBrokenConnector).toHaveBeenLastCalledWith(false);
      expect(loadActionTypes).toBeCalledWith(
        expect.objectContaining({
          featureId: 'alerting',
          includeSystemActions: true,
        })
      );

      expect(loadAllActions).toBeCalledWith(
        expect.objectContaining({
          includeSystemActions: true,
        })
      );
    });

    it('does not render action types disabled by config', async () => {
      await setup();
      await waitFor(() => {
        expect(
          screen.queryByTestId('disabled-by-config-alerting-ActionTypeSelectOption')
        ).not.toBeInTheDocument();
      });
    });

    it('does not render action types hidden in ui', async () => {
      await setup();
      await waitFor(() => {
        expect(
          screen.queryByTestId('hidden-in-ui-alerting-ActionTypeSelectOption')
        ).not.toBeInTheDocument();
      });
    });

    it('render action types which is preconfigured only (disabled by config and with preconfigured connectors)', async () => {
      await setup();
      await screen.findByTestId('preconfigured-alerting-ActionTypeSelectOption');
    });

    it('renders available action groups for the selected action type', async () => {
      await setup();
      await screen.findByTestId(`${actionType.id}-alerting-ActionTypeSelectOption`);
      await userEvent.click(screen.getByTestId(`${actionType.id}-alerting-ActionTypeSelectOption`));
      await screen.findByTestId('addNewActionConnectorActionGroup-0');
      await userEvent.click(screen.getByTestId('addNewActionConnectorActionGroup-0'));
      await screen.findByTestId('addNewActionConnectorActionGroup-0-option-default');
      expect(
        screen.getByTestId('addNewActionConnectorActionGroup-0-option-recovered')
      ).toBeInTheDocument();
    });

    it('renders disabled action groups for selected action type', async () => {
      await setup([
        {
          group: 'recovered',
          id: 'test',
          actionTypeId: disabledByActionType.id,
          params: {
            message: '',
          },
        },
      ]);
      await screen.findByTestId('.jira-alerting-ActionTypeSelectOption');
      await userEvent.click(screen.getByTestId('.jira-alerting-ActionTypeSelectOption'));
      await screen.findByTestId('addNewActionConnectorActionGroup-1');
      await userEvent.click(screen.getByTestId('addNewActionConnectorActionGroup-1'));
      await screen.findByTestId('addNewActionConnectorActionGroup-1-option-default');
      const recoveredOption = screen.getByTestId(
        'addNewActionConnectorActionGroup-1-option-recovered'
      );
      expect(recoveredOption).toBeInTheDocument();
      expect(recoveredOption).toBeDisabled();
    });

    it('renders disabled action groups for custom recovered action groups', async () => {
      await setup(
        [
          {
            group: 'iHaveRecovered',
            id: 'test',
            actionTypeId: disabledByActionType.id,
            params: {
              message: '',
            },
          },
        ],
        'iHaveRecovered'
      );
      await screen.findByTestId('.jira-alerting-ActionTypeSelectOption');
      await userEvent.click(screen.getByTestId('.jira-alerting-ActionTypeSelectOption'));
      await screen.findByTestId('addNewActionConnectorActionGroup-1');
      await userEvent.click(screen.getByTestId('addNewActionConnectorActionGroup-1'));
      await screen.findByTestId('addNewActionConnectorActionGroup-1-option-default');
      const iHaveRecoveredOption = screen.getByTestId(
        'addNewActionConnectorActionGroup-1-option-iHaveRecovered'
      );
      expect(iHaveRecoveredOption).toBeInTheDocument();
      expect(iHaveRecoveredOption).toBeDisabled();
    });

    it('renders available connectors for the selected action type', async () => {
      await setup();
      await screen.findByTestId(`${actionType.id}-alerting-ActionTypeSelectOption`);
      await userEvent.click(screen.getByTestId(`${actionType.id}-alerting-ActionTypeSelectOption`));
      await screen.findByTestId(`selectActionConnector-${actionType.id}-0`);
      const numConnectors = allActions.filter(
        (action) => action.actionTypeId === actionType.id
      ).length;
      const numConnectorsWithMissingSecrets = allActions.filter(
        (action) => action.actionTypeId === actionType.id && action.isMissingSecrets
      ).length;
      const combobox = screen.getByTestId(`selectActionConnector-${actionType.id}-0`);
      await userEvent.click(within(combobox).getByTestId('comboBoxToggleListButton'));
      await waitFor(() => {
        expect(screen.getAllByTestId(/^dropdown-connector-/)).toHaveLength(
          numConnectors - numConnectorsWithMissingSecrets
        );
      });
    });

    it('renders only preconfigured connectors for the selected preconfigured action type', async () => {
      await setup();
      await screen.findByTestId('preconfigured-alerting-ActionTypeSelectOption');
      await userEvent.click(screen.getByTestId('preconfigured-alerting-ActionTypeSelectOption'));
      const combobox = await screen.findByTestId('selectActionConnector-preconfigured-1');
      await userEvent.click(within(combobox).getByTestId('comboBoxToggleListButton'));
      // When the preconfigured-only action type is selected, only test3 (isPreconfigured=true)
      // passes the filter. test3 is auto-selected, so areAllOptionsSelected()=true and
      // EuiComboBox renders "You've selected all available options" instead of option buttons.
      // This confirms that test4 (isPreconfigured=false) was correctly filtered out.
      expect(await screen.findByText("You've selected all available options")).toBeInTheDocument();
      expect(within(combobox).getByRole('combobox')).toHaveValue('Preconfigured Only');
      expect(screen.queryByTestId('dropdown-connector-test4')).not.toBeInTheDocument();
    });

    it('does not render "Add connector" button for preconfigured only action type', async () => {
      await setup();
      await screen.findByTestId('preconfigured-alerting-ActionTypeSelectOption');
      await userEvent.click(screen.getByTestId('preconfigured-alerting-ActionTypeSelectOption'));
      await screen.findAllByTestId(/alertActionAccordion-\d+/);
      expect(
        screen.queryByTestId('addNewActionConnectorButton-preconfigured')
      ).not.toBeInTheDocument();
    });

    it('renders action types disabled by license', async () => {
      await setup();
      await screen.findByTestId('disabled-by-license-alerting-ActionTypeSelectOption');
    });

    it('recognizes actions with broken connectors', async () => {
      const { container } = await setup([
        {
          group: 'default',
          id: 'test',
          actionTypeId: actionType.id,
          params: {
            message: '',
          },
        },
        {
          group: 'default',
          id: 'connector-doesnt-exist',
          actionTypeId: actionType.id,
          params: {
            message: 'broken',
          },
        },
        {
          group: 'not the default',
          id: 'connector-doesnt-exist',
          actionTypeId: actionType.id,
          params: {
            message: 'broken',
          },
        },
      ]);
      expect(setHasActionsWithBrokenConnector).toHaveBeenLastCalledWith(true);
      await waitFor(() => {
        expect(container.querySelectorAll('.euiAccordion')).toHaveLength(3);
      });
      // NOTE: EuiIconTip puts data-test-subj on the tooltip popup (portal), not the icon anchor.
      // The tooltip popup only renders on hover, so we query the warning icon elements directly.
      await waitFor(() => {
        expect(container.querySelectorAll('[data-euiicon-type="warning"]')).toHaveLength(2);
      });
    });
  });

  describe('beta badge (action_type_form)', () => {
    it(`does not render beta badge when isExperimental=undefined`, async () => {
      await setup();
      await waitFor(() => {
        expect(screen.queryByTestId('action-type-form-beta-badge')).not.toBeInTheDocument();
      });
    });

    it(`does not render beta badge when isExperimental=false`, async () => {
      await setup(undefined, undefined, false);
      await waitFor(() => {
        expect(screen.queryByTestId('action-type-form-beta-badge')).not.toBeInTheDocument();
      });
    });

    it(`renders beta badge when isExperimental=true`, async () => {
      await setup(undefined, undefined, true);
      await screen.findByTestId('action-type-form-beta-badge');
    });
  });

  describe('system actions', () => {
    it('renders system action types correctly', async () => {
      await setup();
      await screen.findByTestId(`${systemActionType.id}-alerting-ActionTypeSelectOption`);
      expect(
        screen.getByTestId(`${systemActionType.id}-alerting-ActionTypeSelectOption`)
      ).not.toBeDisabled();
    });

    it('disables the system action type if it is already selected', async () => {
      await setup([
        { id: 'system-connector-.cases', actionTypeId: systemActionType.id, params: {} },
      ]);

      await screen.findByTestId(`${systemActionType.id}-alerting-ActionTypeSelectOption`);
      expect(
        screen.getByTestId(`${systemActionType.id}-alerting-ActionTypeSelectOption`)
      ).toBeDisabled();
    });

    it('allows multiple instances of workflows system action', async () => {
      await setup([{ id: 'system-connector-.workflows', actionTypeId: '.workflows', params: {} }]);

      await screen.findByTestId('.workflows-alerting-ActionTypeSelectOption');
      expect(screen.getByTestId('.workflows-alerting-ActionTypeSelectOption')).not.toBeDisabled();
    });
  });
});
