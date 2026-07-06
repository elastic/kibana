/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';
import { isEqual } from 'lodash';
import type { CaseSeverity, CaseUI } from '../../../../../common';
import { useGetCaseConfiguration } from '../../../../containers/configure/use_get_case_configuration';
import { useGetCaseUsers } from '../../../../containers/use_get_case_users';
import { useGetCaseConnectors } from '../../../../containers/use_get_case_connectors';
import { useCasesFeatures } from '../../../../common/use_cases_features';
import { useGetCurrentUserProfile } from '../../../../containers/user_profiles/use_get_current_user_profile';
import { useGetSupportedActionConnectors } from '../../../../containers/configure/use_get_supported_action_connectors';
import type { CaseUICustomField } from '../../../../../common/ui/types';
import type { EditConnectorProps } from '../../../edit_connector';
import { EditConnector } from '../../../edit_connector';
import { useOnUpdateField } from '../../../case_view/use_on_update_field';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import * as i18n from '../../../case_view/translations';
import { CONNECTORS } from '../../../../common/translations';
import { UserPickerFieldPanel } from './user_picker_field/user_picker_field_panel';
import { SeverityField } from './severity_field';
import type { Assignee } from '../../../user_profiles/types';
import { CategoryField } from './category_field';
import { TagsField } from './tags_field';
import { parseCaseUsers } from '../../../utils';
import { CustomFields } from '../../../case_view/components/custom_fields';
import { useReplaceCustomField } from '../../../../containers/use_replace_custom_field';
import { KibanaServices } from '../../../../common/lib/kibana';
import { TemplateFields } from '../../../case_view/components/template_fields';
import { useGetTemplate } from '../../../templates_v2/hooks/use_get_template';
import * as redesignI18n from '../../translations';
import { SidebarAccordionSection } from './sidebar_accordion_section';
import { SidebarSectionSettingsButton } from './sidebar_section_settings_button';
import { useSidebarAccordionsState } from './use_sidebar_accordions_state';

const isFieldUpdating = (isLoading: boolean, loadingKey: string | null, key: string): boolean =>
  isLoading && loadingKey === key;

const getIsLoadingAssigneeData = (
  isLoading: boolean,
  loadingKey: string | null,
  isLoadingCaseUsers: boolean,
  isLoadingCurrentUserProfile: boolean
): boolean =>
  isFieldUpdating(isLoading, loadingKey, 'assignees') ||
  isLoadingCaseUsers ||
  isLoadingCurrentUserProfile;

export const CaseViewSidebar = ({ caseData }: { caseData: CaseUI }) => {
  const { euiTheme } = useEuiTheme();
  const fieldsGroupStyles = useMemo(() => css({ gap: euiTheme.size.m }), [euiTheme]);
  const { permissions } = useCasesContext();
  const { caseAssignmentAuthorized, pushToServiceAuthorized } = useCasesFeatures();
  const { isOpen, onToggle } = useSidebarAccordionsState();

  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const { data: caseUsers, isLoading: isLoadingCaseUsers } = useGetCaseUsers(caseData.id);
  const { data: casesConfiguration } = useGetCaseConfiguration();
  const { data: currentUserProfile, isFetching: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();
  const { isLoading: isLoadingAllAvailableConnectors, data: supportedActionConnectors } =
    useGetSupportedActionConnectors();
  const { isLoading: isUpdatingCustomField, mutate: replaceCustomField } = useReplaceCustomField();
  const { data: templateData } = useGetTemplate(caseData.template?.id, caseData.template?.version);

  const isTemplatesV2Enabled = KibanaServices.getConfig()?.templates?.enabled ?? false;

  const { userProfiles } = parseCaseUsers({
    caseUsers,
    createdBy: caseData.createdBy,
  });

  const assignees = useMemo(
    () => caseData.assignees.map((assignee) => assignee.uid),
    [caseData.assignees]
  );

  const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({ caseData });

  const isLoadingAssigneeData = getIsLoadingAssigneeData(
    isLoading,
    loadingKey,
    isLoadingCaseUsers,
    isLoadingCurrentUserProfile
  );

  const onSubmitTags = useCallback(
    (newTags: string[]) => onUpdateField({ key: 'tags', value: newTags }),
    [onUpdateField]
  );

  const onSubmitCategory = useCallback(
    (newCategory: string | null) => onUpdateField({ key: 'category', value: newCategory }),
    [onUpdateField]
  );

  const onUpdateSeverity = useCallback(
    (newSeverity: CaseSeverity) => onUpdateField({ key: 'severity', value: newSeverity }),
    [onUpdateField]
  );

  const onUpdateAssignees = useCallback(
    (newAssignees: Assignee[]) => {
      const newAssigneeUids = newAssignees.map((assignee) => ({ uid: assignee.uid }));
      const newUids = newAssignees.map((assignee) => assignee.uid);
      if (!isEqual([...newUids].sort(), [...assignees].sort())) {
        onUpdateField({ key: 'assignees', value: newAssigneeUids });
      }
    },
    [assignees, onUpdateField]
  );

  const onSubmitConnector = useCallback<EditConnectorProps['onSubmit']>(
    (connector) => {
      onUpdateField({ key: 'connector', value: connector });
    },
    [onUpdateField]
  );

  const onSubmitCustomField = useCallback(
    (customField: CaseUICustomField) => {
      replaceCustomField({
        caseId: caseData.id,
        customFieldId: customField.key,
        customFieldValue: customField.value,
        caseVersion: caseData.version,
        caseData,
      });
    },
    [replaceCustomField, caseData]
  );

  const showConnectorSidebar =
    pushToServiceAuthorized && caseConnectors && supportedActionConnectors;

  const templateFieldsTitle = templateData?.name ?? redesignI18n.TEMPLATE_FIELDS_TITLE;

  const participants =
    caseUsers != null ? [...caseUsers.participants, ...caseUsers.assignees] : undefined;

  return (
    <EuiFlexItem grow={2}>
      <EuiSpacer size="s" />
      <EuiPanel
        data-test-subj="case-view-page-sidebar"
        hasShadow={false}
        hasBorder={true}
        paddingSize="l"
      >
        <EuiScreenReaderOnly>
          <h2>{i18n.CASE_SETTINGS}</h2>
        </EuiScreenReaderOnly>
        <SidebarAccordionSection
          id="attributes"
          title={redesignI18n.ATTRIBUTES_TITLE}
          isOpen={isOpen('attributes')}
          onToggle={onToggle}
          data-test-subj="case-view-sidebar-attributes"
        >
          <EuiFlexGroup direction="column" responsive={false} css={fieldsGroupStyles}>
            {caseAssignmentAuthorized ? (
              <UserPickerFieldPanel
                isEditable
                title={redesignI18n.ASSIGNED_TITLE}
                dataTestSubj="case-view-assignees-field-panel"
                caseAssignees={caseData.assignees}
                currentUserProfile={currentUserProfile}
                onAssigneesChanged={onUpdateAssignees}
                isLoading={isLoadingAssigneeData}
                userProfiles={userProfiles ?? new Map()}
                caseId={caseData.id}
                caseTitle={caseData.title}
              />
            ) : null}
            <SeverityField
              isDisabled={!permissions.update}
              isLoading={isFieldUpdating(isLoading, loadingKey, 'severity')}
              selectedSeverity={caseData.severity}
              onSeverityChange={onUpdateSeverity}
            />
            {participants != null ? (
              <UserPickerFieldPanel
                title={redesignI18n.PARTICIPANTS_TITLE}
                users={participants}
                userProfiles={userProfiles ?? new Map()}
                isLoading={isLoadingCaseUsers}
                dataTestSubj="case-view-participants-field-panel"
                caseId={caseData.id}
                caseTitle={caseData.title}
              />
            ) : null}
            <TagsField
              tags={caseData.tags}
              onSubmit={onSubmitTags}
              isLoading={isFieldUpdating(isLoading, loadingKey, 'tags')}
            />
            <CategoryField
              category={caseData.category}
              onSubmit={onSubmitCategory}
              isLoading={isFieldUpdating(isLoading, loadingKey, 'category')}
            />
          </EuiFlexGroup>
        </SidebarAccordionSection>
        <EuiSpacer size="m" />
        <SidebarAccordionSection
          id="templateFields"
          title={templateFieldsTitle}
          extraAction={
            <SidebarSectionSettingsButton data-test-subj="case-view-sidebar-template-fields-settings" />
          }
          isOpen={isOpen('templateFields')}
          onToggle={onToggle}
          data-test-subj="case-view-sidebar-template-fields"
        >
          <EuiFlexGroup direction="column" responsive={false} css={fieldsGroupStyles}>
            <CustomFields
              isLoading={
                isFieldUpdating(isLoading, loadingKey, 'customFields') || isUpdatingCustomField
              }
              customFields={caseData.customFields}
              customFieldsConfiguration={casesConfiguration.customFields}
              onSubmit={onSubmitCustomField}
            />
            {isTemplatesV2Enabled && (
              <TemplateFields
                caseData={caseData}
                onUpdateField={onUpdateField}
                showHeader={false}
              />
            )}
          </EuiFlexGroup>
        </SidebarAccordionSection>
        {showConnectorSidebar ? (
          <>
            <EuiSpacer size="m" />
            <SidebarAccordionSection
              id="connectors"
              title={CONNECTORS}
              extraAction={
                <SidebarSectionSettingsButton data-test-subj="case-view-sidebar-connectors-settings" />
              }
              isOpen={isOpen('connectors')}
              onToggle={onToggle}
              data-test-subj="case-view-sidebar-connectors"
            >
              <EditConnector
                caseData={caseData}
                caseConnectors={caseConnectors}
                supportedActionConnectors={supportedActionConnectors}
                isLoading={
                  isLoadingAllAvailableConnectors ||
                  isFieldUpdating(isLoading, loadingKey, 'connector')
                }
                onSubmit={onSubmitConnector}
                key={caseData.connector.id}
                showHeader={false}
              />
            </SidebarAccordionSection>
          </>
        ) : null}
      </EuiPanel>
    </EuiFlexItem>
  );
};
CaseViewSidebar.displayName = 'CaseViewSidebar';
