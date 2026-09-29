/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import {
  alertComment,
  basicCase,
  connectorsMock,
  customFieldsConfigurationMock,
  customFieldsMock,
  getCaseUsersMockResponse,
} from '../../../../containers/mock';
import {
  noUpdateCasesPermissions,
  noCasesSettingsPermission,
  renderWithTestingProviders,
} from '../../../../common/mock';
import { CaseViewSidebar } from './case_view_sidebar';
import type { CaseUI } from '../../../../../common';
import { CaseSeverity, ConnectorTypes } from '../../../../../common/types/domain';
import { CaseMetricsFeature } from '../../../../../common/types/api';
import { useGetSupportedActionConnectors } from '../../../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../../../containers/use_get_tags';
import { useGetCategories } from '../../../../containers/use_get_categories';
import { useGetCaseConnectors } from '../../../../containers/use_get_case_connectors';
import { useGetCaseUsers } from '../../../../containers/use_get_case_users';
import { waitForComponentToUpdate } from '../../../../common/test_utils';
import { getCaseConnectorsMockResponse } from '../../../../common/mock/connectors';
import { useOnUpdateField } from '../../use_on_update_field';
import { useCasesFeatures } from '../../../../common/use_cases_features';
import { useGetCaseConfiguration } from '../../../../containers/configure/use_get_case_configuration';
import { useGetCurrentUserProfile } from '../../../../containers/user_profiles/use_get_current_user_profile';
import { useReplaceCustomField } from '../../../../containers/use_replace_custom_field';
import { KibanaServices } from '../../../../common/lib/kibana';
import { useGetTemplate } from '../../../templates_v2/hooks/use_get_template';
import { useGetFieldDefinitions } from '../../../field_library/hooks/use_get_field_definitions';

vi.mock('../template_fields', () => {
  const mocked = {
    TemplateFields: () => <div data-test-subj="case-view-template-fields" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../global_case_fields', () => {
  const mocked = {
    GlobalCaseFields: () => <div data-test-subj="case-view-global-case-fields" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../templates_v2/hooks/use_get_template', () => {
  const mocked = {
    useGetTemplate: vi.fn().mockReturnValue({ data: undefined }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../field_library/hooks/use_get_field_definitions', () => {
  const mocked = {
    useGetFieldDefinitions: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../containers/configure/use_get_supported_action_connectors');
vi.mock('../../../../common/navigation/hooks');
vi.mock('../../../../containers/use_get_tags');
vi.mock('../../../../containers/use_get_categories');
vi.mock('../../../../containers/user_profiles/use_bulk_get_user_profiles');
vi.mock('../../../../containers/use_get_case_connectors');
vi.mock('../../../../containers/use_get_case_users');
vi.mock('../../../../containers/use_replace_custom_field');
vi.mock('../../use_on_update_field');
vi.mock('../../../../common/use_cases_features');
vi.mock('../../../../containers/configure/use_get_case_configuration');
vi.mock('../../../../containers/user_profiles/use_get_current_user_profile');

(useGetTags as Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch: vi.fn() });
(useGetCategories as Mock).mockReturnValue({ data: ['foo', 'bar'], refetch: vi.fn() });
(useGetCaseConfiguration as Mock).mockReturnValue({ data: { observableTypes: [] } });
(useGetCurrentUserProfile as Mock).mockReturnValue({ data: {}, isFetching: false });

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertComment],
  connector: {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  },
};

const caseUsers = getCaseUsersMockResponse();
const useGetCasesFeaturesRes = {
  metricsFeatures: [CaseMetricsFeature.ALERTS_COUNT],
  pushToServiceAuthorized: true,
  caseAssignmentAuthorized: true,
  isSyncAlertsEnabled: true,
};

const replaceCustomField = vi.fn();
const replaceCustomFieldAsync = vi.fn().mockResolvedValue(undefined);
const onUpdateField = vi.fn();

const useGetConnectorsMock = useGetSupportedActionConnectors as Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as Mock;
const useGetCaseUsersMock = useGetCaseUsers as Mock;
const useOnUpdateFieldMock = useOnUpdateField as Mock;
const useCasesFeaturesMock = useCasesFeatures as Mock;
const useReplaceCustomFieldMock = useReplaceCustomField as Mock;
const useGetTemplateMock = useGetTemplate as Mock;
const useGetFieldDefinitionsMock = useGetFieldDefinitions as Mock;

describe('CaseViewSidebar (redesign)', () => {
  const caseConnectors = getCaseConnectorsMockResponse();
  const platinumLicense = licensingMock.createLicense({
    license: { type: 'platinum' },
  });
  const basicLicense = licensingMock.createLicense({
    license: { type: 'basic' },
  });

  beforeAll(() => {
    useGetConnectorsMock.mockReturnValue({ data: connectorsMock, isLoading: false });
    useGetCaseConnectorsMock.mockReturnValue({
      isLoading: false,
      data: caseConnectors,
    });
    useOnUpdateFieldMock.mockReturnValue({
      isLoading: false,
      onUpdateField,
    });
    useReplaceCustomFieldMock.mockImplementation(() => ({
      isUpdatingCustomField: false,
      isError: false,
      mutate: replaceCustomField,
      mutateAsync: replaceCustomFieldAsync,
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: caseUsers });
    useCasesFeaturesMock.mockReturnValue(useGetCasesFeaturesRes);
    useGetTemplateMock.mockReturnValue({ data: undefined });
    useGetFieldDefinitionsMock.mockReturnValue({
      data: { fieldDefinitions: [{ id: 'global-field-1' }] },
      isLoading: false,
    });
  });

  it('should render the sidebar with tags, categories, and connector', async () => {
    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />, {
      wrapperProps: { license: platinumLicense },
    });

    const caseViewSidebar = await screen.findByTestId('case-view-page-sidebar');
    expect(caseViewSidebar).toHaveClass('euiPanel');
    expect(screen.getByTestId('case-view-sidebar-attributes')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-sidebar-connectors')).toBeInTheDocument();
    expect(await within(caseViewSidebar).findByTestId('case-tags')).toBeInTheDocument();
    expect(await within(caseViewSidebar).findByTestId('cases-categories')).toBeInTheDocument();
    expect(
      await within(caseViewSidebar).findByTestId('case-view-edit-connector')
    ).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('should disable the severity selector when the user does not have update permissions', async () => {
    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />, {
      wrapperProps: { license: platinumLicense, permissions: noUpdateCasesPermissions() },
    });

    expect(await screen.findByTestId('case-severity-selection')).toBeDisabled();

    await waitForComponentToUpdate();
  });

  it('should show a loading when updating severity', async () => {
    useOnUpdateFieldMock.mockReturnValue({ isLoading: true, loadingKey: 'severity' });

    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

    expect(
      (await screen.findByTestId('case-severity-selection')).classList.contains(
        'euiSuperSelectControl-isLoading'
      )
    ).toBeTruthy();
  });

  it('should not show a loading for severity when updating tags', async () => {
    useOnUpdateFieldMock.mockReturnValue({ isLoading: true, loadingKey: 'tags' });

    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

    expect(
      (await screen.findByTestId('case-severity-selection')).classList.contains(
        'euiSuperSelectControl-isLoading'
      )
    ).not.toBeTruthy();
  });

  it('persists a severity change immediately, with no confirm step', async () => {
    const user = userEvent.setup();
    // Set here rather than in the `beforeAll` block: the `beforeEach` below it clears mocks, so a
    // return value registered up there is gone by the time a test runs.
    useOnUpdateFieldMock.mockReturnValue({ isLoading: false, onUpdateField });

    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

    expect(
      await screen.findAllByTestId(`case-severity-selection-${CaseSeverity.LOW}`)
    ).not.toHaveLength(0);

    await user.click(screen.getByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByTestId(`case-severity-selection-${CaseSeverity.CRITICAL}`));

    expect(onUpdateField).toHaveBeenCalledWith({
      key: 'severity',
      value: CaseSeverity.CRITICAL,
    });
    expect(screen.queryByTestId('template-field-confirm-severity')).not.toBeInTheDocument();
  });

  it('does not render duplicate data-test-subj when assignees and participants are both loading', async () => {
    useGetCaseUsersMock.mockReturnValue({
      isLoading: true,
      data: {
        participants: [],
        assignees: [],
        unassignedUsers: [],
        reporter: caseUsers.reporter,
      },
    });

    renderWithTestingProviders(<CaseViewSidebar caseData={{ ...caseData, assignees: [] }} />, {
      wrapperProps: { license: platinumLicense },
    });

    expect(
      await screen.findByTestId('case-view-assignees-field-panel-loading')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('case-view-participants-field-panel-loading')
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('case-view-assignees-button-loading')).toHaveLength(0);
  });

  it('should not render the assignees on basic license', () => {
    useCasesFeaturesMock.mockReturnValue({
      ...useGetCasesFeaturesRes,
      caseAssignmentAuthorized: false,
    });

    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />, {
      wrapperProps: { license: basicLicense },
    });

    expect(screen.queryByTestId('case-view-assignees-field-panel')).not.toBeInTheDocument();
  });

  it('should render the assignees on platinum license', async () => {
    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />, {
      wrapperProps: { license: platinumLicense },
    });

    expect(await screen.findByTestId('case-view-assignees-field-panel')).toBeInTheDocument();

    await waitForComponentToUpdate();
  });

  it('should not render the connector on basic license', () => {
    useCasesFeaturesMock.mockReturnValue({
      ...useGetCasesFeaturesRes,
      pushToServiceAuthorized: false,
    });

    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />, {
      wrapperProps: { license: basicLicense },
    });

    expect(screen.queryByTestId('case-view-sidebar-connectors')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-view-edit-connector')).not.toBeInTheDocument();
  });

  it('should render the connector on platinum license', async () => {
    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />, {
      wrapperProps: { license: platinumLicense },
    });

    expect(await screen.findByTestId('case-view-sidebar-connectors')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-edit-connector')).toBeInTheDocument();
    expect(await screen.findByTestId('case-view-sidebar-connectors-settings')).toBeInTheDocument();
  });

  it('should call useReplaceCustomField correctly', async () => {
    vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      templates: { enabled: true },
    } as ReturnType<typeof KibanaServices.getConfig>);
    localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'true');
    localStorage.setItem(
      'securitySolution.cases.caseView.sidebarAccordions',
      JSON.stringify({
        attributes: true,
        legacyCustomFields: true,
        templateFields: true,
        connectors: true,
      })
    );
    (useGetCaseConfiguration as Mock).mockReturnValue({
      data: {
        customFields: [customFieldsConfigurationMock[1]],
        observableTypes: [],
      },
    });

    const caseDataWithCustomFields: CaseUI = {
      ...caseData,
      customFields: [customFieldsMock[1]],
    };

    renderWithTestingProviders(<CaseViewSidebar caseData={caseDataWithCustomFields} />);

    expect(await screen.findByTestId('case-view-sidebar-legacy-custom-fields')).toBeInTheDocument();

    // Every field in the section starts as a label/value row; clicking any one of them (like the
    // template fields section) opens the whole section for editing.
    await userEvent.click(
      await screen.findByTestId(`template-field-edit-${customFieldsMock[1].key}`)
    );

    await userEvent.click(await screen.findByRole('switch'));

    // The legacy custom fields section buffers edits: toggling puts the section into edit mode and
    // the write only goes out on Save.
    expect(replaceCustomFieldAsync).not.toHaveBeenCalled();
    expect(await screen.findByTestId('section-edit-changed-count')).toHaveTextContent(
      '1 unsaved field'
    );

    await userEvent.click(await screen.findByTestId('section-edit-save'));

    await waitFor(() => {
      expect(replaceCustomFieldAsync).toHaveBeenCalledWith({
        caseId: caseData.id,
        caseVersion: caseData.version,
        caseData: caseDataWithCustomFields,
        customFieldId: customFieldsMock[1].key,
        customFieldValue: false,
      });
    });
  });

  it('does not render legacy custom fields accordion when the show-legacy switch is off', async () => {
    vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      templates: { enabled: true },
    } as ReturnType<typeof KibanaServices.getConfig>);
    localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'false');
    (useGetCaseConfiguration as Mock).mockReturnValue({
      data: {
        customFields: [customFieldsConfigurationMock[1]],
        observableTypes: [],
      },
    });

    renderWithTestingProviders(
      <CaseViewSidebar caseData={{ ...caseData, customFields: [customFieldsMock[1]] }} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('case-view-page-sidebar')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('case-view-sidebar-legacy-custom-fields')).not.toBeInTheDocument();
  });

  it('renders legacy custom fields accordion when templates v2 is disabled and fields are configured', async () => {
    vi.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);
    (useGetCaseConfiguration as Mock).mockReturnValue({
      data: {
        customFields: [customFieldsConfigurationMock[1]],
        observableTypes: [],
      },
    });

    renderWithTestingProviders(
      <CaseViewSidebar caseData={{ ...caseData, customFields: [customFieldsMock[1]] }} />
    );

    expect(await screen.findByTestId('case-view-sidebar-legacy-custom-fields')).toBeInTheDocument();
    expect(
      screen.queryByTestId('legacy-custom-fields-deprecation-callout')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('legacy-custom-fields-deprecated-badge')).not.toBeInTheDocument();
  });

  it('renders legacy custom fields accordion closed by default when the switch is on', async () => {
    vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      templates: { enabled: true },
    } as ReturnType<typeof KibanaServices.getConfig>);
    localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'true');
    (useGetCaseConfiguration as Mock).mockReturnValue({
      data: {
        customFields: [customFieldsConfigurationMock[1]],
        observableTypes: [],
      },
    });

    renderWithTestingProviders(
      <CaseViewSidebar caseData={{ ...caseData, customFields: [customFieldsMock[1]] }} />
    );

    const accordion = await screen.findByTestId('case-view-sidebar-legacy-custom-fields');
    expect(accordion).toBeInTheDocument();
    expect(screen.getByTestId('case-view-sidebar-legacy-custom-fields-toggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('shows settings and custom fields links in the deprecation callout when the user has settings permission', async () => {
    vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      templates: { enabled: true },
    } as ReturnType<typeof KibanaServices.getConfig>);
    localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'true');
    (useGetCaseConfiguration as Mock).mockReturnValue({
      data: {
        customFields: [customFieldsConfigurationMock[1]],
        observableTypes: [],
      },
    });

    renderWithTestingProviders(
      <CaseViewSidebar caseData={{ ...caseData, customFields: [customFieldsMock[1]] }} />
    );

    // Accordion is closed by default; open it to reveal the callout.
    await userEvent.click(screen.getByTestId('case-view-sidebar-legacy-custom-fields-toggle'));

    // announceOnMount duplicates callout content into a live region with the same test subjects.
    const content = await screen.findByTestId('legacy-custom-fields-deprecation-callout__content');
    expect(within(content).getByTestId('legacy-custom-fields-view-new-link')).toBeInTheDocument();
    expect(
      within(content).getByTestId('legacy-custom-fields-view-settings-link')
    ).toBeInTheDocument();
  });

  it('shows the administrator message in the deprecation callout when the user lacks settings permission', async () => {
    vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
      templates: { enabled: true },
    } as ReturnType<typeof KibanaServices.getConfig>);
    localStorage.setItem('securitySolution.cases.showLegacyCustomFields', 'true');
    (useGetCaseConfiguration as Mock).mockReturnValue({
      data: {
        customFields: [customFieldsConfigurationMock[1]],
        observableTypes: [],
      },
    });

    renderWithTestingProviders(
      <CaseViewSidebar caseData={{ ...caseData, customFields: [customFieldsMock[1]] }} />,
      {
        wrapperProps: { permissions: noCasesSettingsPermission() },
      }
    );

    await userEvent.click(screen.getByTestId('case-view-sidebar-legacy-custom-fields-toggle'));

    const content = await screen.findByTestId('legacy-custom-fields-deprecation-callout__content');
    expect(
      within(content).queryByTestId('legacy-custom-fields-view-new-link')
    ).not.toBeInTheDocument();
    expect(
      within(content).queryByTestId('legacy-custom-fields-view-settings-link')
    ).not.toBeInTheDocument();
    expect(
      within(content).getByText(/Contact your administrator to remove the deprecated fields/i)
    ).toBeInTheDocument();
  });

  it('should show the category correctly', async () => {
    renderWithTestingProviders(
      <CaseViewSidebar caseData={{ ...caseData, category: 'My category' }} />
    );

    expect(await screen.findByDisplayValue('My category')).toBeInTheDocument();
  });

  describe('Assignees', () => {
    it('should render assignees in the sidebar', async () => {
      renderWithTestingProviders(
        <CaseViewSidebar
          caseData={{
            ...caseData,
            assignees: caseUsers.assignees.map((assignee) => ({
              uid: assignee.uid ?? 'not-valid',
            })),
          }}
        />,
        {
          wrapperProps: { license: platinumLicense },
        }
      );

      const assigneesPanel = within(await screen.findByTestId('case-view-assignees-field-panel'));

      expect(await assigneesPanel.findByText('Assigned')).toBeInTheDocument();
      expect(
        await assigneesPanel.findByTestId('case-user-profile-avatar-unknown-user')
      ).toBeInTheDocument();
      expect(
        await assigneesPanel.findByTestId('case-user-profile-avatar-elastic')
      ).toBeInTheDocument();
      expect(
        await assigneesPanel.findByTestId('case-user-profile-avatar-fuzzy_marten')
      ).toBeInTheDocument();
      expect(
        await assigneesPanel.findByTestId('case-user-profile-avatar-misty_mackerel')
      ).toBeInTheDocument();
    });
  });

  describe('TemplateFields', () => {
    it('does not render the template fields section when templates v2 is disabled', async () => {
      vi.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);

      renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

      await waitFor(() => {
        expect(screen.getByTestId('case-view-page-sidebar')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('case-view-sidebar-template-fields')).not.toBeInTheDocument();
      expect(screen.queryByTestId('case-view-template-fields')).not.toBeInTheDocument();
      expect(screen.queryByTestId('case-view-global-case-fields')).not.toBeInTheDocument();
      // The settings popover has nothing to configure when templates v2 itself is disabled.
      expect(
        screen.queryByTestId('case-view-sidebar-template-fields-settings')
      ).not.toBeInTheDocument();
    });

    it('renders TemplateFields when templates v2 is enabled and a template is applied', async () => {
      vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
        templates: { enabled: true },
      } as ReturnType<typeof KibanaServices.getConfig>);
      useGetTemplateMock.mockReturnValue({ data: { name: 'SLA breach response' } });

      const caseDataWithTemplate: CaseUI = {
        ...caseData,
        template: { id: 'test-template-id', version: 1 },
      };

      renderWithTestingProviders(<CaseViewSidebar caseData={caseDataWithTemplate} />);

      expect(await screen.findByTestId('case-view-sidebar-template-fields')).toBeInTheDocument();
      expect(screen.getByTestId('case-view-template-fields')).toBeInTheDocument();
      expect(screen.getByTestId('case-view-sidebar-template-fields-settings')).toBeInTheDocument();
      // The section keeps its stable title; the applied template is named in the subtitle.
      expect(screen.getByText('Custom fields')).toBeInTheDocument();
      expect(screen.getByTestId('case-view-sidebar-applied-template')).toHaveTextContent(
        'Template: SLA breach response'
      );
      expect(screen.queryByTestId('case-view-sidebar-no-template-applied')).not.toBeInTheDocument();
      // Global fields render alongside the applied template's fields.
      expect(screen.getByTestId('case-view-global-case-fields')).toBeInTheDocument();
    });

    it('shows the no-template subtitle when no template is applied', async () => {
      vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
        templates: { enabled: true },
      } as ReturnType<typeof KibanaServices.getConfig>);

      renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

      expect(await screen.findByTestId('case-view-sidebar-no-template-applied')).toHaveTextContent(
        'No template applied'
      );
      expect(screen.queryByTestId('case-view-template-fields')).not.toBeInTheDocument();
      // Global fields apply regardless of whether a template is selected, and their presence
      // means the section body has content — so no empty state.
      expect(screen.getByTestId('case-view-global-case-fields')).toBeInTheDocument();
      expect(screen.queryByTestId('case-view-sidebar-fields-empty')).not.toBeInTheDocument();
    });

    it('shows an empty state when no template is applied and no global fields exist', async () => {
      vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
        templates: { enabled: true },
      } as ReturnType<typeof KibanaServices.getConfig>);
      useGetFieldDefinitionsMock.mockReturnValue({
        data: { fieldDefinitions: [] },
        isLoading: false,
      });

      renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

      expect(await screen.findByTestId('case-view-sidebar-fields-empty')).toHaveTextContent(
        'Apply a template to see its fields here.'
      );
    });

    it('does not render the template settings popover for users without update permissions', async () => {
      vi.spyOn(KibanaServices, 'getConfig').mockReturnValue({
        templates: { enabled: true },
      } as ReturnType<typeof KibanaServices.getConfig>);

      renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />, {
        wrapperProps: { permissions: noUpdateCasesPermissions() },
      });

      await waitFor(() => {
        expect(screen.getByTestId('case-view-page-sidebar')).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId('case-view-sidebar-template-fields-settings')
      ).not.toBeInTheDocument();
    });
  });
});
