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
import React, { useMemo } from 'react';
import type { CaseUI } from '../../../../../../common';
import { EditConnector } from '../../../../edit_connector';
import * as i18n from '../../../../case_view/translations';
import { CONNECTORS } from '../../../../../common/translations';
import { UserPickerFieldPanel } from './user_picker_field/user_picker_field_panel';
import { SeverityField } from './severity_field';
import { CategoryField } from './category_field';
import { TagsField } from './tags_field';
import { CustomFields } from '../../../../case_view/components/custom_fields';
import { TemplateFields } from '../../../../case_view/components/template_fields';
import * as redesignI18n from '../../../translations';
import { SidebarAccordionSection } from './sidebar_accordion_section';
import { SidebarSectionSettingsButton } from './sidebar_section_settings_button';
import { TemplateSettingsPopover } from './template_settings_popover';
import { useCaseViewSidebar } from './hooks/use_case_view_sidebar';

export const CaseViewSidebar = ({ caseData }: { caseData: CaseUI }) => {
  const { euiTheme } = useEuiTheme();
  const fieldsGroupStyles = useMemo(() => css({ gap: euiTheme.size.m }), [euiTheme]);

  const {
    permissions,
    caseAssignmentAuthorized,
    pushToServiceAuthorized,
    isOpen,
    onToggle,
    caseConnectors,
    casesConfiguration,
    currentUserProfile,
    userProfiles,
    participants,
    supportedActionConnectors,
    isTemplatesV2Enabled,
    templateFieldsTitle,
    onUpdateField,
    onSubmitTags,
    onSubmitCategory,
    onUpdateSeverity,
    onUpdateAssignees,
    onSubmitConnector,
    onSubmitCustomField,
    isLoadingCaseUsers,
    isLoadingAssigneeData,
    isSeverityLoading,
    isTagsLoading,
    isCategoryLoading,
    isCustomFieldsLoading,
    isConnectorLoading,
  } = useCaseViewSidebar({ caseData });

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
              isLoading={isSeverityLoading}
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
            <TagsField tags={caseData.tags} onSubmit={onSubmitTags} isLoading={isTagsLoading} />
            <CategoryField
              category={caseData.category}
              onSubmit={onSubmitCategory}
              isLoading={isCategoryLoading}
            />
          </EuiFlexGroup>
        </SidebarAccordionSection>
        <EuiSpacer size="m" />
        <SidebarAccordionSection
          id="templateFields"
          title={templateFieldsTitle}
          extraAction={
            <TemplateSettingsPopover
              caseData={caseData}
              isTemplatesEnabled={isTemplatesV2Enabled}
              data-test-subj="case-view-sidebar-template-fields-settings"
            />
          }
          isOpen={isOpen('templateFields')}
          onToggle={onToggle}
          data-test-subj="case-view-sidebar-template-fields"
        >
          <EuiFlexGroup direction="column" responsive={false} css={fieldsGroupStyles}>
            <CustomFields
              isLoading={isCustomFieldsLoading}
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
        {pushToServiceAuthorized && caseConnectors && supportedActionConnectors ? (
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
                isLoading={isConnectorLoading}
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
