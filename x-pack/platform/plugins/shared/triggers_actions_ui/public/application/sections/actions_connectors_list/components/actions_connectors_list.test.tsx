/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import ActionsConnectorsList from './actions_connectors_list';
import { coreMock } from '@kbn/core/public/mocks';
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { useKibana } from '../../../../common/lib/kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ActionConnector, GenericValidationResult } from '../../../../types';
import { EditConnectorTabs } from '../../../../types';
import { times } from 'lodash';
import { useHistory, useParams } from 'react-router-dom';
import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({}),
  useLocation: jest.fn().mockReturnValue({ search: '' }),
  useHistory: jest.fn().mockReturnValue({ push: jest.fn(), createHref: jest.fn() }),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const actionTypeRegistry = actionTypeRegistryMock.create();
const mocks = coreMock.createSetup();
const { loadActionTypes } = jest.requireMock('../../../lib/action_connector_api');

describe('actions_connectors_list', () => {
  describe('component empty', () => {
    beforeEach(async () => {
      loadActionTypes.mockResolvedValueOnce([
        { id: 'test', name: 'Test', supportedFeatureIds: ['alerting'] },
        { id: 'test2', name: 'Test2', supportedFeatureIds: ['alerting'] },
      ]);
      actionTypeRegistry.has.mockReturnValue(true);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: { delete: true, save: true, show: true },
      };
    });

    it('renders empty prompt', async () => {
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={[]}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      expect(await screen.findByTestId('createFirstConnectorEmptyPrompt')).toBeInTheDocument();
      expect(await screen.findByTestId('createFirstActionButton')).toBeInTheDocument();
    });

    it('if click create button should render CreateConnectorFlyout', async () => {
      const setAddFlyoutVisibility = jest.fn();
      const user = userEvent.setup();

      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={setAddFlyoutVisibility}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={[]}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      const createFirstActionButton = await screen.findByTestId('createFirstActionButton');
      await user.click(createFirstActionButton);
      await waitFor(() => {
        expect(setAddFlyoutVisibility).toBeCalled();
      });
    });
  });

  describe('component with items', () => {
    const mockedActions: ActionConnector[] = [
      createMockActionConnector({
        id: '1',
        actionTypeId: 'test',
        name: 'Test Connector 1',
        referencedByCount: 1,
      }),
      createMockActionConnector({
        id: '2',
        actionTypeId: 'test2',
        name: 'Test Connector 2',
        referencedByCount: 1,
      }),
      createMockActionConnector({
        id: '3',
        actionTypeId: 'test2',
        name: 'Test Connector 3',
        isMissingSecrets: true,
        referencedByCount: 1,
        isPreconfigured: true,
      }),
      createMockActionConnector({
        id: '4',
        actionTypeId: 'nonexistent',
        name: 'Test Connector 4',
        referencedByCount: 1,
      }),
      createMockActionConnector({
        id: '5',
        actionTypeId: 'test3',
        name: 'Test Connector 5',
        referencedByCount: 1,
      }),
      createMockActionConnector({
        id: '6',
        actionTypeId: 'test4',
        name: 'Test Connector 6',
        referencedByCount: 1,
      }),
    ];
    let mockedEditItem: jest.Mock;

    beforeEach(async () => {
      loadActionTypes.mockResolvedValueOnce([
        { id: 'test', name: 'Test', enabled: true, supportedFeatureIds: ['alerting'] },
        { id: 'test2', name: 'Test2', enabled: true, supportedFeatureIds: ['alerting', 'cases'] },
        {
          id: 'test3',
          name: 'Test3',
          enabled: true,
          supportedFeatureIds: ['alerting', 'cases', 'siem', 'uptime'],
        },
        { id: 'test4', name: 'Test4', enabled: true, supportedFeatureIds: ['cases'] },
      ]);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      actionTypeRegistry.get.mockImplementation((id: string) => {
        return {
          id,
          iconClass: 'test',
          selectMessage: 'test',
          validateParams: (): Promise<GenericValidationResult<unknown>> =>
            Promise.resolve({ errors: {} }),
          actionConnectorFields: null,
          actionParamsFields: React.lazy(async () => ({ default: () => <></> })),
          actionTypeTitle: 'Test Action',
          defaultActionParams: {},
          defaultRecoveredActionParams: {},
          source: 'stack',
        };
      });
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: { delete: true, save: true, show: true },
      };
      mockedEditItem = jest.fn();
    });

    it('renders table of connectors', async () => {
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={mockedEditItem}
            isLoadingActions={false}
            actions={mockedActions}
            setActions={() => {}}
          />
        </IntlProvider>
      );
      expect(await screen.findByTestId('actionsTable')).toBeInTheDocument();
      expect(await screen.findAllByTestId('connectors-row')).toHaveLength(6);
    });

    it('renders table with preconfigured connectors', async () => {
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={mockedEditItem}
            isLoadingActions={false}
            actions={mockedActions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      expect(await screen.findByTestId('preConfiguredTitleMessage')).toBeInTheDocument();
    });

    it('renders unknown connector type as disabled', async () => {
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={mockedEditItem}
            isLoadingActions={false}
            actions={mockedActions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      const editButton = await screen.findByTestId('edit4');
      expect(editButton).toBeDisabled();
      const deleteButtons = await screen.findAllByTestId('deleteConnector');
      expect(deleteButtons[deleteButtons.length - 1]).not.toBeDisabled();
      const runButtons = await screen.findAllByTestId('runConnector');
      expect(runButtons[runButtons.length - 1]).toBeDisabled();
    });

    it('renders fix button when connector secrets is missing', async () => {
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={mockedEditItem}
            isLoadingActions={false}
            actions={mockedActions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      const deleteButtons = await screen.findAllByTestId('deleteConnector');
      expect(deleteButtons[deleteButtons.length - 1]).not.toBeDisabled();
      const fixButtons = await screen.findAllByTestId('fixConnectorButton');
      expect(fixButtons[fixButtons.length - 1]).not.toBeDisabled();
    });

    it('supports pagination', async () => {
      const user = userEvent.setup();

      const pagedActions = times(15, (index) => ({
        id: `connector${index}`,
        actionTypeId: 'test',
        name: `My test ${index}`,
        secrets: {},
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 1,
        config: {},
      })) as ActionConnector[];

      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={mockedEditItem}
            isLoadingActions={false}
            actions={pagedActions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      const nextPageButton = await screen.findByTestId('pagination-button-1');
      await user.click(nextPageButton);

      expect(await screen.findByTestId('actionsTable')).toBeInTheDocument();

      // Expect an item from the second page to be visible
      expect(await screen.findByText('My test 10')).toBeInTheDocument();
      // And an item that was only on the first page to be gone (ensures page actually changed)
      expect(screen.queryByText('My test 0')).not.toBeInTheDocument();
    });

    it('if delete item that is used in a rule should show a warning in the popup', async () => {
      const user = userEvent.setup();

      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={mockedEditItem}
            isLoadingActions={false}
            actions={mockedActions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      await screen.findByTestId('actionsTable');

      const deleteButtons = await screen.findAllByTestId('deleteConnector');

      await user.click(deleteButtons[0]);

      expect(await screen.findByTestId('deleteIdsConfirmation')).toBeInTheDocument();

      const confirmation = screen.getByTestId('deleteIdsConfirmation');
      expect(confirmation).toHaveTextContent(/this connector is currently in use/i);
    });

    it('call editItem when connectorId presented in url', async () => {
      const selectedConnector = mockedActions[3];
      const mockedCreateHref = jest.fn(({ pathname }) => pathname);
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
      (useParams as jest.Mock).mockReturnValue({ connectorId: selectedConnector.id });
      (useHistory as jest.Mock).mockReturnValue({ createHref: mockedCreateHref });

      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={mockedEditItem}
            isLoadingActions={false}
            actions={mockedActions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      await waitFor(() => {
        expect(mockedEditItem).toBeCalledWith(selectedConnector, EditConnectorTabs.Configuration);
      });
      expect(mockedCreateHref).toHaveBeenCalledWith({ pathname: '/connectors' });
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/connectors');
      replaceStateSpy.mockRestore();
    });
  });

  describe('component empty with show only capability', () => {
    beforeEach(async () => {
      loadActionTypes.mockResolvedValueOnce([
        { id: 'test', name: 'Test', supportedFeatureIds: ['alerting'] },
        { id: 'test2', name: 'Test2', supportedFeatureIds: ['alerting'] },
      ]);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: { show: true, save: false, delete: false },
      };
    });

    it('renders no permissions to create connector', async () => {
      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={[]}
            setActions={() => {}}
          />
        </IntlProvider>
      );
      expect(screen.getByText(/no permissions to create connectors/i)).toBeInTheDocument();
      expect(screen.queryByTestId('createConnectorButton')).not.toBeInTheDocument();
    });
  });

  describe('with show only capability', () => {
    beforeEach(async () => {
      loadActionTypes.mockResolvedValueOnce([
        { id: 'test', name: 'Test', supportedFeatureIds: ['alerting'] },
        { id: 'test2', name: 'Test2', supportedFeatureIds: ['alerting'] },
      ]);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: { show: true, save: false, delete: false },
      };
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    });

    it('renders table of connectors with delete button disabled', async () => {
      const actions = [
        {
          id: '1',
          actionTypeId: 'test',
          isPreconfigured: false,
          isDeprecated: false,
          referencedByCount: 1,
          config: {},
        },
        {
          id: '2',
          actionTypeId: 'test2',
          referencedByCount: 1,
          isPreconfigured: false,
          isDeprecated: false,
          config: {},
        },
      ] as ActionConnector[];

      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={actions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      expect(await screen.findByTestId('actionsTable')).toBeInTheDocument();
      const deleteButtons = await screen.findAllByTestId('deleteConnector');
      deleteButtons.forEach((btn) => expect(btn).toBeDisabled());
    });
  });

  describe('component with disabled items', () => {
    beforeEach(async () => {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: 'Test',
          enabled: false,
          enabledInConfig: false,
          enabledInLicense: true,
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: 'Test2',
          enabled: false,
          enabledInConfig: true,
          enabledInLicense: false,
          supportedFeatureIds: ['alerting'],
        },
      ]);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: { show: true, save: true, delete: true },
      };
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    });

    it('renders table of connectors and disables correct rows', async () => {
      const actions = [
        { id: '1', actionTypeId: 'test', referencedByCount: 1, config: {} },
        { id: '2', actionTypeId: 'test2', referencedByCount: 1, config: {} },
        { id: '3', actionTypeId: 'test3', isPreconfigured: true, isDeprecated: false },
      ] as ActionConnector[];

      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={actions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      expect(await screen.findByTestId('actionsTable')).toBeInTheDocument();

      const edit1 = await screen.findByTestId('edit1');
      const edit2 = await screen.findByTestId('edit2');
      expect(edit1).toBeDisabled();
      expect(edit2).toBeDisabled();

      const edit3 = await screen.findByTestId('edit3');
      expect(edit3).toBeDisabled();

      const runButtons = await screen.findAllByTestId('runConnector');

      expect(runButtons[0]).toBeDisabled();
      expect(runButtons[1]).toBeDisabled();
    });
  });

  describe('component with deprecated connectors', () => {
    beforeEach(async () => {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'test',
          name: '.servicenow',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          supportedFeatureIds: ['alerting'],
        },
        {
          id: 'test2',
          name: '.servicenow-sir',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          supportedFeatureIds: ['alerting'],
        },
      ]);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: { show: true, save: true, delete: true },
      };
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;

      // Mock the action type registry to return valid action types
      actionTypeRegistry.get.mockImplementation((id: string) => {
        return {
          id,
          iconClass: 'test',
          selectMessage: 'test',
          validateParams: (): Promise<GenericValidationResult<unknown>> =>
            Promise.resolve({ errors: {} }),
          actionConnectorFields: null,
          actionParamsFields: React.lazy(async () => ({ default: () => <></> })),
          actionTypeTitle: 'Test Action',
          defaultActionParams: {},
          defaultRecoveredActionParams: {},
          source: 'stack',
        };
      });

      // Mock the has method to return true for all action types
      actionTypeRegistry.has.mockReturnValue(true);
    });

    it('shows the warning icon', async () => {
      const actions = [
        {
          id: '1',
          actionTypeId: 'test',
          name: 'ServiceNow Connector',
          secrets: {},
          isSystemAction: false,
          referencedByCount: 1,
          config: { usesTableApi: true },
          isDeprecated: true,
          isMissingSecrets: false,
        },
        {
          id: '2',
          actionTypeId: 'test2',
          name: 'ServiceNow SIR Connector',
          secrets: {},
          isSystemAction: false,
          referencedByCount: 1,
          config: { usesTableApi: true },
          isDeprecated: true,
          isMissingSecrets: false,
        },
      ] as Array<ActionConnector<{ usesTableApi: boolean }>>;

      render(
        <ThemeProvider theme={() => ({ eui: { euiSizeS: '15px' }, darkMode: true })}>
          <IntlProvider>
            <ActionsConnectorsList
              setAddFlyoutVisibility={() => {}}
              loadActions={async () => {}}
              editItem={() => {}}
              isLoadingActions={false}
              actions={actions}
              setActions={() => {}}
            />
          </IntlProvider>
        </ThemeProvider>
      );

      expect(await screen.findByTestId('actionsTable')).toBeInTheDocument();
      expect(loadActionTypes).toHaveBeenCalled();
      expect(screen.getAllByTestId('connectorsTableCell-actionType')).toHaveLength(2);
      expect(screen.getByTestId('edit1')).toBeInTheDocument();
      expect(screen.getByTestId('edit2')).toBeInTheDocument();

      const warningIcons = screen
        .getByTestId('actionsTable')
        .querySelectorAll('[data-euiicon-type="warning"]');
      expect(warningIcons.length).toEqual(2);
    });
  });

  describe('component with spec connectors', () => {
    beforeEach(async () => {
      loadActionTypes.mockResolvedValueOnce([
        {
          id: 'spec.connector',
          name: 'Spec Connector',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          supportedFeatureIds: ['alerting'],
          source: 'spec',
        },
      ]);
      const [
        {
          application: { capabilities },
        },
      ] = await mocks.getStartServices();
      useKibanaMock().services.application.capabilities = {
        ...capabilities,
        actions: { execute: true, save: true, delete: true },
      };
      useKibanaMock().services.actionTypeRegistry = actionTypeRegistry;
    });

    it('should disable the test play button', async () => {
      const actions = [
        {
          id: '1',
          actionTypeId: 'spec.connector',
          name: 'Spec Connector 1',
          referencedByCount: 1,
          config: {},
          source: 'stack',
        },
      ] as ActionConnector[];

      render(
        <IntlProvider>
          <ActionsConnectorsList
            setAddFlyoutVisibility={() => {}}
            loadActions={async () => {}}
            editItem={() => {}}
            isLoadingActions={false}
            actions={actions}
            setActions={() => {}}
          />
        </IntlProvider>
      );

      expect(await screen.findByTestId('actionsTable')).toBeInTheDocument();
      expect(await screen.findAllByTestId('connectors-row')).toHaveLength(1);
      const runButtons = await screen.findAllByTestId('runConnector');
      expect(runButtons[0]).toBeDisabled();
    });
  });
});
