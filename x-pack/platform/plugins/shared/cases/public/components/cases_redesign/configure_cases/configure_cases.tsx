/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiCallOut,
  EuiHorizontalRule,
  EuiLink,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

import { useKibana } from '../../../common/lib/kibana';
import { CasesPageBody } from '../../app/cases_page_body';
import { Connectors } from '../../configure_cases/connectors';
import * as configureCasesI18n from '../../configure_cases/translations';
import { useConfigureCasesController } from '../../configure_cases/use_configure_cases_controller';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesBreadcrumbs } from '../../use_breadcrumbs';
import { CasesDeepLinkId } from '../../../common/navigation';
import { ObservableTypes } from '../../observable_types';
import { AutomaticClosureSwitch } from './automatic_closure_switch';
import { SettingsSection } from './settings_section';
import { ConfigureCasesAppHeader } from './configure_cases_app_header';
import { OldCustomFieldsAndTemplatesSection } from './old_custom_fields_and_templates_section';
import * as observableTypesI18n from '../../observable_types/translations';

const contentWrapperCss = css`
  box-sizing: content-box;
  max-width: 800px;
  width: 100%;
`;

const getFormWrapperCss = (euiTheme: EuiThemeComputed) => css`
  padding-top: ${euiTheme.size.xl};
  padding-bottom: ${euiTheme.size.xl};
  .euiFlyout {
    z-index: ${Number(euiTheme.levels.navigation) + 1};
  }
`;

type LegacyFlyoutType = 'customField' | 'template';

// This component intentionally mirrors the connector/closure/observable-types logic in
// `../../configure_cases` (the legacy settings page) via the shared `useConfigureCasesController`
// hook. Both pages are kept as separate presentational implementations while behind the
// `casesRedesign.settings` feature flag so each can evolve without risking the other; the legacy
// component will be deleted once the redesign ships.
export const ConfigureCasesRedesign: React.FC = React.memo(() => {
  useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure);
  const { euiTheme } = useEuiTheme();
  const { permissions } = useCasesContext();
  const { docLinks } = useKibana().services;

  const {
    hasMinimumLicensePermissions,
    hasMinimumLicensePermissionsForObservables,
    isObservablesFeatureEnabled,
    configurationId,
    configurationVersion,
    closureType,
    connector,
    mappings,
    customFields,
    templates,
    observableTypes,
    isPersistingConfiguration,
    isLoadingCaseConfiguration,
    isLoadingConnectors,
    connectors,
    actionTypes,
    isLoadingAny,
    connectorIsValid,
    updateConnectorDisabled,
    flyOutVisibility,
    setFlyOutVisibility,
    persistCaseConfigure,
    onClickUpdateConnector,
    onAddNewConnector,
    onChangeConnector,
    onChangeClosureType,
    ConnectorAddFlyout,
    ConnectorEditFlyout,
    onEditObservableType,
    onDeleteObservableType,
    AddOrEditObservableTypeFlyout,
  } = useConfigureCasesController<LegacyFlyoutType>();

  const showObservableTypesSection =
    hasMinimumLicensePermissionsForObservables && isObservablesFeatureEnabled;

  return (
    <>
      <ConfigureCasesAppHeader />
      <CasesPageBody>
        <EuiPageBody restrictWidth={false}>
          <div css={getFormWrapperCss(euiTheme)}>
            {hasMinimumLicensePermissions && !connectorIsValid && (
              <>
                <div css={contentWrapperCss}>
                  <EuiCallOut
                    announceOnMount
                    title={configureCasesI18n.WARNING_NO_CONNECTOR_TITLE}
                    color="warning"
                    iconType="question"
                    data-test-subj="configure-cases-warning-callout"
                  >
                    <FormattedMessage
                      defaultMessage="The selected connector has been deleted or you do not have the {appropriateLicense} to use it. Either select a different connector or create a new one."
                      id="xpack.cases.configure.connectorDeletedOrLicenseWarning"
                      values={{
                        appropriateLicense: (
                          <EuiLink href={docLinks.links.subscriptions} target="_blank">
                            {configureCasesI18n.LINK_APPROPRIATE_LICENSE}
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiCallOut>
                </div>
                <EuiSpacer size="xl" />
              </>
            )}
            <div css={contentWrapperCss}>
              <EuiPanel hasBorder paddingSize="m" data-test-subj="cases-redesign-settings-panel">
                {hasMinimumLicensePermissions && (
                  <SettingsSection
                    data-test-subj="cases-redesign-external-incident-management-section"
                    title={configureCasesI18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE}
                    description={configureCasesI18n.INCIDENT_MANAGEMENT_SYSTEM_DESC}
                  >
                    <Connectors
                      actionTypes={actionTypes}
                      connectors={connectors ?? []}
                      disabled={
                        isPersistingConfiguration || isLoadingConnectors || !permissions.settings
                      }
                      handleShowEditFlyout={onClickUpdateConnector}
                      hideTitle
                      isLoading={isLoadingAny}
                      mappings={mappings}
                      onChangeConnector={onChangeConnector}
                      selectedConnector={connector}
                      updateConnectorDisabled={updateConnectorDisabled || !permissions.settings}
                      onAddNewConnector={onAddNewConnector}
                    />
                  </SettingsSection>
                )}

                {hasMinimumLicensePermissions && <EuiHorizontalRule margin="l" />}

                {hasMinimumLicensePermissions && (
                  <SettingsSection
                    data-test-subj="cases-redesign-case-closures-section"
                    title={configureCasesI18n.CASE_CLOSURE_OPTIONS_TITLE}
                    description={configureCasesI18n.CASE_CLOSURE_OPTIONS_DESC}
                  >
                    <AutomaticClosureSwitch
                      closureTypeSelected={closureType}
                      disabled={
                        isPersistingConfiguration || isLoadingConnectors || !permissions.settings
                      }
                      onChangeClosureType={onChangeClosureType}
                    />
                  </SettingsSection>
                )}

                {hasMinimumLicensePermissions && showObservableTypesSection && (
                  <EuiHorizontalRule margin="l" />
                )}

                {showObservableTypesSection && (
                  <SettingsSection
                    data-test-subj="cases-redesign-observable-types-section"
                    title={observableTypesI18n.TITLE}
                    description={observableTypesI18n.DESCRIPTION}
                  >
                    <ObservableTypes
                      observableTypes={observableTypes}
                      isLoading={isLoadingCaseConfiguration}
                      disabled={isLoadingCaseConfiguration}
                      hideTitle
                      useLineSeparators
                      handleAddObservableType={() =>
                        setFlyOutVisibility({ type: 'observableTypes', visible: true })
                      }
                      handleDeleteObservableType={onDeleteObservableType}
                      handleEditObservableType={onEditObservableType}
                    />
                  </SettingsSection>
                )}

                {/* Rendered for both templates-flag states: with templates v2 ON it is the
                    read-mostly "legacy" section behind a local-storage switch; with templates
                    v2 OFF it is the only custom-fields / templates management UI (the v2
                    templates and field-library routes are unregistered), so hiding it would
                    leave existing custom fields undeletable while they still block case
                    creation. The section adapts its copy and gating internally. */}
                <OldCustomFieldsAndTemplatesSection
                  configurationId={configurationId}
                  configurationVersion={configurationVersion}
                  closureType={closureType}
                  connector={connector}
                  customFields={customFields}
                  templates={templates}
                  connectors={connectors ?? []}
                  isLoadingCaseConfiguration={isLoadingCaseConfiguration}
                  persistCaseConfigure={persistCaseConfigure}
                  flyOutVisibility={flyOutVisibility}
                  setFlyOutVisibility={setFlyOutVisibility}
                />
              </EuiPanel>
            </div>

            <EuiSpacer size="xl" />

            {ConnectorAddFlyout}
            {ConnectorEditFlyout}
            {AddOrEditObservableTypeFlyout}
          </div>
        </EuiPageBody>
      </CasesPageBody>
    </>
  );
});

ConfigureCasesRedesign.displayName = 'ConfigureCasesRedesign';

// eslint-disable-next-line import/no-default-export
export { ConfigureCasesRedesign as default };
