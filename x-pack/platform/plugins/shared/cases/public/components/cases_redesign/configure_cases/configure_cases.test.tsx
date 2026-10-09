/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
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
import * as customFieldsI18n from '../../custom_fields/translations';
import * as templatesI18n from '../../templates/translations';
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
    localStorage.clear();

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

    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: false,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
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

  describe('when templates v2 is disabled', () => {
    // The beforeEach default mocks templatesEnabled: false; the v2 templates /
    // field-library pages are unregistered in that state, so the settings page
    // must remain the (only) place to manage custom fields and templates.

    it('renders the custom fields and templates section always expanded, without the show-legacy switch', async () => {
      renderWithTestingProviders(<ConfigureCasesRedesign />);

      expect(
        await screen.findByTestId('cases-redesign-legacy-custom-fields-section')
      ).toBeInTheDocument();
      expect(screen.getByTestId('custom-fields-list')).toBeInTheDocument();
      expect(screen.getByTestId('templates-list')).toBeInTheDocument();
      expect(screen.queryByTestId('show-legacy-custom-fields-switch')).not.toBeInTheDocument();
    });

    it('does not render migration copy, v2-page links, or deprecated badges', async () => {
      renderWithTestingProviders(<ConfigureCasesRedesign />);

      await screen.findByTestId('cases-redesign-legacy-custom-fields-section');

      expect(screen.queryByTestId('legacy-templates-view-new-link')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legacy-custom-fields-view-new-link')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legacy-custom-fields-deprecated-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('legacy-templates-deprecated-badge')).not.toBeInTheDocument();
    });

    it('uses the standard add-button labels rather than the legacy ones', async () => {
      useGetCaseConfigurationMock.mockImplementation(() => ({
        ...useCaseConfigureResponse,
        data: {
          ...useCaseConfigureResponse.data,
          customFields: [],
          templates: [],
        },
      }));

      renderWithTestingProviders(<ConfigureCasesRedesign />);

      expect(await screen.findByTestId('add-custom-field')).toHaveTextContent(
        customFieldsI18n.ADD_CUSTOM_FIELD
      );
      expect(screen.getByTestId('add-template')).toHaveTextContent(templatesI18n.ADD_TEMPLATE);
    });

    it('persists custom field deletion', async () => {
      renderWithTestingProviders(<ConfigureCasesRedesign />);

      const list = await screen.findByTestId('custom-fields-list');
      await userEvent.click(
        within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
      );

      expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Delete'));

      expect(persistCaseConfigure).toHaveBeenCalledWith(
        expect.objectContaining({
          customFields: expect.not.arrayContaining([
            expect.objectContaining({ key: customFieldsConfigurationMock[0].key }),
          ]),
        })
      );
    });
  });

  it('renders the legacy section with switch off by default when templates v2 is enabled', async () => {
    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: true,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
    });

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    expect(
      await screen.findByTestId('cases-redesign-legacy-custom-fields-section')
    ).toBeInTheDocument();
    expect(screen.getByTestId('show-legacy-custom-fields-switch')).not.toBeChecked();
    expect(screen.queryByTestId('custom-fields-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('templates-list')).not.toBeInTheDocument();
  });

  it('shows legacy custom fields and templates lists when the switch is turned on', async () => {
    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: true,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
    });

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    await userEvent.click(await screen.findByTestId('show-legacy-custom-fields-switch'));

    expect(await screen.findByTestId('custom-fields-list')).toBeInTheDocument();
    expect(screen.getByTestId('templates-list')).toBeInTheDocument();
    expect(screen.getByTestId('legacy-custom-fields-view-new-link')).toBeInTheDocument();
    expect(screen.getByTestId('legacy-templates-view-new-link')).toBeInTheDocument();
  });

  it('forces the show-legacy switch on when required fields lack defaults', async () => {
    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: true,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
    });
    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      data: {
        ...useCaseConfigureResponse.data,
        customFields: [
          {
            ...customFieldsConfigurationMock[0],
            required: true,
            defaultValue: undefined,
          },
        ],
        templates: templatesConfigurationMock,
      },
    }));

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    const toggle = await screen.findByTestId('show-legacy-custom-fields-switch');
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
    expect(await screen.findByTestId('custom-fields-list')).toBeInTheDocument();
  });

  it('shows add buttons for empty legacy custom fields and templates when the switch is on', async () => {
    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: true,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
    });
    useGetCaseConfigurationMock.mockImplementation(() => ({
      ...useCaseConfigureResponse,
      data: {
        ...useCaseConfigureResponse.data,
        customFields: [],
        templates: [],
      },
    }));

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    expect(
      await screen.findByTestId('cases-redesign-legacy-custom-fields-section')
    ).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('show-legacy-custom-fields-switch'));

    expect(await screen.findByTestId('add-custom-field')).toHaveTextContent(
      configureCasesI18n.ADD_LEGACY_CUSTOM_FIELD
    );
    expect(screen.getByTestId('add-template')).toHaveTextContent(
      configureCasesI18n.ADD_LEGACY_TEMPLATE
    );
    expect(screen.queryByTestId('empty-custom-fields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-templates')).not.toBeInTheDocument();
  });

  it('opens add custom field flyout with add header when switch is on', async () => {
    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: true,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
    });

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    await userEvent.click(await screen.findByTestId('show-legacy-custom-fields-switch'));
    await userEvent.click(await screen.findByTestId('add-custom-field'));

    expect(await screen.findByTestId('common-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent(
      configureCasesI18n.ADD_CUSTOM_FIELD
    );
  });

  it('opens add flyout after edit without keeping the previous field', async () => {
    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: true,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
    });

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    await userEvent.click(await screen.findByTestId('show-legacy-custom-fields-switch'));

    const list = await screen.findByTestId('custom-fields-list');
    await userEvent.click(
      within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-edit`)
    );

    expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent(
      configureCasesI18n.EDIT_CUSTOM_FIELD
    );

    await userEvent.click(screen.getByTestId('common-flyout-cancel'));
    await userEvent.click(await screen.findByTestId('add-custom-field'));

    expect(await screen.findByTestId('common-flyout-header')).toHaveTextContent(
      configureCasesI18n.ADD_CUSTOM_FIELD
    );
  });

  it('persists custom field deletion when switch is on', async () => {
    const { useCasesConfig } = jest.requireMock('../../../common/lib/kibana');
    useCasesConfig.mockReturnValue({
      attachmentsEnabled: false,
      chatEnabled: false,
      templatesEnabled: true,
      detailsRedesignEnabled: false,
      casesRedesign: { list: false, details: false, settings: true },
    });

    renderWithTestingProviders(<ConfigureCasesRedesign />);

    await userEvent.click(await screen.findByTestId('show-legacy-custom-fields-switch'));

    const list = await screen.findByTestId('custom-fields-list');
    await userEvent.click(
      within(list).getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-delete`)
    );

    expect(await screen.findByTestId('confirm-delete-modal')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Delete'));

    expect(persistCaseConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        customFields: expect.not.arrayContaining([
          expect.objectContaining({ key: customFieldsConfigurationMock[0].key }),
        ]),
      })
    );
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
