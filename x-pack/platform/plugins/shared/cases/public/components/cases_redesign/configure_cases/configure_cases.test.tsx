/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

import { ConnectorTypes } from '../../../../common/types/domain';
import { ConfigureCasesRedesign } from './configure_cases';
import {
  customFieldsConfigurationMock,
  observableTypesMock,
  templatesConfigurationMock,
} from '../../../containers/mock';
import { renderWithTestingProviders } from '../../../common/mock';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import { usePersistConfiguration } from '../../../containers/configure/use_persist_configuration';
import { useGetActionTypes } from '../../../containers/configure/use_action_types';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { useLicense } from '../../../common/use_license';
import { useKibana } from '../../../common/lib/kibana';
import {
  useActionTypesResponse,
  useCaseConfigureResponse,
  useConnectorsResponse,
  usePersistConfigurationMockResponse,
} from '../../configure_cases/__mock__';
import * as configureCasesI18n from '../../configure_cases/translations';
import * as observableTypesI18n from '../../observable_types/translations';
import { CASE_SETTINGS_TITLE } from '../translations';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../../containers/configure/use_get_case_configuration');
jest.mock('../../../containers/configure/use_persist_configuration');
jest.mock('../../../containers/configure/use_action_types');
jest.mock('../../../common/use_license');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const usePersistConfigurationMock = usePersistConfiguration as jest.Mock;
const useGetActionTypesMock = useGetActionTypes as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const getAddConnectorFlyoutMock = jest.fn();
const getEditConnectorFlyoutMock = jest.fn();

describe('ConfigureCasesRedesign', () => {
  const persistCaseConfigure = jest.fn();

  beforeAll(() => {
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow',
      iconClass: 'logoSecurity',
    });

    useKibanaMock().services.triggersActionsUi.getAddConnectorFlyout =
      getAddConnectorFlyoutMock.mockReturnValue(<div data-test-subj="add-connector-flyout" />);

    useKibanaMock().services.triggersActionsUi.getEditConnectorFlyout =
      getEditConnectorFlyoutMock.mockReturnValue(<div data-test-subj="edit-connector-flyout" />);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    useGetActionTypesMock.mockImplementation(() => useActionTypesResponse);
    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      data: {
        ...useCaseConfigureResponse.data,
        customFields: customFieldsConfigurationMock,
        templates: templatesConfigurationMock,
      },
    }));
    usePersistConfigurationMock.mockImplementation(() => ({
      ...usePersistConfigurationMockResponse,
      mutate: persistCaseConfigure,
    }));
    useGetConnectorsMock.mockImplementation(() => ({
      ...useConnectorsResponse,
      isLoading: false,
    }));
    useLicenseMock.mockReturnValue({
      isAtLeastGold: () => true,
      isAtLeastPlatinum: () => true,
    });
  });

  it('renders the redesigned settings page with the app header title', async () => {
    renderWithTestingProviders(<ConfigureCasesRedesign />);

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      CASE_SETTINGS_TITLE
    );
  });

  it('renders the three settings sections in a single panel', async () => {
    renderWithTestingProviders(<ConfigureCasesRedesign />);

    expect(await screen.findByTestId('cases-redesign-settings-panel')).toBeInTheDocument();
    expect(
      screen.getByTestId('cases-redesign-external-incident-management-section')
    ).toBeInTheDocument();
    expect(screen.getByTestId('cases-redesign-case-closures-section')).toBeInTheDocument();
    expect(screen.getByTestId('cases-redesign-observable-types-section')).toBeInTheDocument();
  });

  it('does not render legacy custom fields or templates sections', async () => {
    renderWithTestingProviders(<ConfigureCasesRedesign />);

    await screen.findByTestId('cases-redesign-settings-panel');

    expect(screen.queryByTestId('custom-fields-form-group')).not.toBeInTheDocument();
    expect(screen.queryByTestId('templates-form-group')).not.toBeInTheDocument();
  });

  it('renders connector and closure controls', async () => {
    renderWithTestingProviders(<ConfigureCasesRedesign />);

    expect(await screen.findByTestId('dropdown-connectors')).toBeInTheDocument();
    expect(screen.getByTestId('automatic-closure-switch')).toBeInTheDocument();
    expect(
      screen.getByText(configureCasesI18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE)
    ).toBeInTheDocument();
    expect(screen.getByText(configureCasesI18n.CASE_CLOSURE_OPTIONS_TITLE)).toBeInTheDocument();
    expect(screen.getByText(observableTypesI18n.TITLE)).toBeInTheDocument();
  });

  it('persists closure type changes while preserving custom fields and templates', async () => {
    renderWithTestingProviders(<ConfigureCasesRedesign />);

    await userEvent.click(await screen.findByTestId('automatic-closure-switch'));

    expect(persistCaseConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        closureType: 'close-by-pushing',
        customFields: customFieldsConfigurationMock,
        templates: templatesConfigurationMock,
      })
    );
  });

  it('renders observable types as line-separated rows without a subdued panel', async () => {
    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      data: {
        ...useCaseConfigureResponse.data,
        customFields: customFieldsConfigurationMock,
        templates: templatesConfigurationMock,
        observableTypes: observableTypesMock,
      },
    }));

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    const row = await screen.findByTestId(`observable-type-${observableTypesMock[0].key}`);

    expect(row.className).not.toContain('euiPanel');
    expect(screen.queryByTestId('observable-types-panel')).not.toBeInTheDocument();
  });

  it('shows the connector-invalid warning callout when the selected connector is missing', async () => {
    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      data: {
        ...useCaseConfigureResponse.data,
        customFields: customFieldsConfigurationMock,
        templates: templatesConfigurationMock,
        connector: {
          id: 'not-exists',
          name: 'unchanged',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
    }));
    useGetConnectorsMock.mockImplementation(() => ({
      ...useConnectorsResponse,
      data: [],
      isLoading: false,
    }));

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    expect(await screen.findByTestId('configure-cases-warning-callout')).toBeInTheDocument();
    expect(
      screen.queryByTestId('case-configure-update-selected-connector-button')
    ).not.toBeInTheDocument();
  });

  it('does not render observable types when the observables feature is disabled', async () => {
    renderWithTestingProviders(<ConfigureCasesRedesign />, {
      wrapperProps: { features: { observables: { enabled: false, autoExtract: false } } },
    });

    await screen.findByTestId('cases-redesign-settings-panel');

    expect(screen.queryByTestId('cases-redesign-observable-types-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-observable-type')).not.toBeInTheDocument();
  });
});
