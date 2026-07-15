/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '../../../../../containers/mock';
import { noUpdateCasesPermissions, renderWithTestingProviders } from '../../../../../common/mock';
import { CaseViewSidebar } from './case_view_sidebar';
import type { CaseUI } from '../../../../../../common';
import { CaseSeverity, ConnectorTypes } from '../../../../../../common/types/domain';
import { CaseMetricsFeature } from '../../../../../../common/types/api';
import { useGetSupportedActionConnectors } from '../../../../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../../../../containers/use_get_tags';
import { useGetCategories } from '../../../../../containers/use_get_categories';
import { useGetCaseConnectors } from '../../../../../containers/use_get_case_connectors';
import { useGetCaseUsers } from '../../../../../containers/use_get_case_users';
import { waitForComponentToUpdate } from '../../../../../common/test_utils';
import { getCaseConnectorsMockResponse } from '../../../../../common/mock/connectors';
import { useOnUpdateField } from '../../../../case_view/use_on_update_field';
import { useCasesFeatures } from '../../../../../common/use_cases_features';
import { useGetCaseConfiguration } from '../../../../../containers/configure/use_get_case_configuration';
import { useGetCurrentUserProfile } from '../../../../../containers/user_profiles/use_get_current_user_profile';
import { useReplaceCustomField } from '../../../../../containers/use_replace_custom_field';
import { KibanaServices } from '../../../../../common/lib/kibana';

jest.mock('../../../../case_view/components/template_fields', () => ({
  TemplateFields: () => <div data-test-subj="case-view-template-fields" />,
}));

jest.mock('../../../../case_view/components/global_case_fields', () => ({
  GlobalCaseFields: () => <div data-test-subj="case-view-global-case-fields" />,
}));

jest.mock('../../../../templates_v2/hooks/use_get_template', () => ({
  useGetTemplate: jest.fn().mockReturnValue({ data: undefined }),
}));

jest.mock('../../../../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../../../../common/navigation/hooks');
jest.mock('../../../../../containers/use_get_tags');
jest.mock('../../../../../containers/use_get_categories');
jest.mock('../../../../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../../../containers/use_get_case_connectors');
jest.mock('../../../../../containers/use_get_case_users');
jest.mock('../../../../../containers/use_replace_custom_field');
jest.mock('../../../../case_view/use_on_update_field');
jest.mock('../../../../../common/use_cases_features');
jest.mock('../../../../../containers/configure/use_get_case_configuration');
jest.mock('../../../../../containers/user_profiles/use_get_current_user_profile');

(useGetTags as jest.Mock).mockReturnValue({ data: ['coke', 'pepsi'], refetch: jest.fn() });
(useGetCategories as jest.Mock).mockReturnValue({ data: ['foo', 'bar'], refetch: jest.fn() });
(useGetCaseConfiguration as jest.Mock).mockReturnValue({ data: { observableTypes: [] } });
(useGetCurrentUserProfile as jest.Mock).mockReturnValue({ data: {}, isFetching: false });

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
  isAlertsEnabled: true,
  isSyncAlertsEnabled: true,
};

const replaceCustomField = jest.fn();

const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetCaseConnectorsMock = useGetCaseConnectors as jest.Mock;
const useGetCaseUsersMock = useGetCaseUsers as jest.Mock;
const useOnUpdateFieldMock = useOnUpdateField as jest.Mock;
const useCasesFeaturesMock = useCasesFeatures as jest.Mock;
const useReplaceCustomFieldMock = useReplaceCustomField as jest.Mock;

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
      useOnUpdateField: jest.fn,
    });
    useReplaceCustomFieldMock.mockImplementation(() => ({
      isUpdatingCustomField: false,
      isError: false,
      mutate: replaceCustomField,
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseUsersMock.mockReturnValue({ isLoading: false, data: caseUsers });
    useCasesFeaturesMock.mockReturnValue(useGetCasesFeaturesRes);
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

  it('preserves a pending severity edit when the Attributes accordion is collapsed and reopened', async () => {
    const user = userEvent.setup();

    renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

    expect(
      await screen.findAllByTestId(`case-severity-selection-${CaseSeverity.LOW}`)
    ).not.toHaveLength(0);

    await user.click(screen.getByTestId('case-severity-selection'));
    await waitForEuiPopoverOpen();
    await user.click(screen.getByTestId(`case-severity-selection-${CaseSeverity.CRITICAL}`));

    expect(screen.getByTestId('template-field-confirm-severity')).toBeInTheDocument();

    await user.click(screen.getByTestId('case-view-sidebar-attributes-toggle'));
    await user.click(screen.getByTestId('case-view-sidebar-attributes-toggle'));

    expect(
      screen.getAllByTestId(`case-severity-selection-${CaseSeverity.CRITICAL}`).length
    ).not.toBe(0);
    expect(screen.getByTestId('template-field-confirm-severity')).toBeInTheDocument();
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
    jest
      .spyOn(KibanaServices, 'getConfig')
      .mockReturnValue({ templates: { enabled: true } } as ReturnType<
        typeof KibanaServices.getConfig
      >);
    (useGetCaseConfiguration as jest.Mock).mockReturnValue({
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

    await userEvent.click(await screen.findByRole('switch'));

    await waitFor(() => {
      expect(replaceCustomField).toHaveBeenCalledWith({
        caseId: caseData.id,
        caseVersion: caseData.version,
        caseData: caseDataWithCustomFields,
        customFieldId: customFieldsMock[1].key,
        customFieldValue: false,
      });
    });
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
      jest.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);

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
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      const caseDataWithTemplate: CaseUI = {
        ...caseData,
        template: { id: 'test-template-id', version: 1 },
      };

      renderWithTestingProviders(<CaseViewSidebar caseData={caseDataWithTemplate} />);

      expect(await screen.findByTestId('case-view-sidebar-template-fields')).toBeInTheDocument();
      expect(screen.getByTestId('case-view-template-fields')).toBeInTheDocument();
      expect(screen.getByTestId('case-view-sidebar-template-fields-settings')).toBeInTheDocument();
      expect(
        screen.queryByTestId('case-view-sidebar-no-template-selected')
      ).not.toBeInTheDocument();
      // Global fields render alongside the applied template's fields.
      expect(screen.getByTestId('case-view-global-case-fields')).toBeInTheDocument();
    });

    it('shows a "No template selected" placeholder when templates v2 is enabled but no template is applied', async () => {
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

      renderWithTestingProviders(<CaseViewSidebar caseData={caseData} />);

      expect(
        await screen.findByTestId('case-view-sidebar-no-template-selected')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('case-view-template-fields')).not.toBeInTheDocument();
      // Global fields apply regardless of whether a template is selected.
      expect(screen.getByTestId('case-view-global-case-fields')).toBeInTheDocument();
    });

    it('does not render the template settings popover for users without update permissions', async () => {
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

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
