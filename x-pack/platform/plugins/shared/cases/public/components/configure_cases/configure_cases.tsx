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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { useKibana } from '../../common/lib/kibana';
import { CasesPageBody } from '../app/cases_page_body';
import { Connectors } from './connectors';
import { SyncSettings } from '../edit_connector/sync_settings';
import { FieldSyncTable } from './field_sync_table';
import { ExternalFieldMappingTable } from './external_field_mapping_table';
import { EXTERNAL_SYNC_FREE_FORM_CONNECTOR_TYPES } from '../../../common/utils/external_sync_fields';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import * as configureCasesI18n from './translations';
import { useConfigureCasesController } from './use_configure_cases_controller';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesBreadcrumbs } from '../use_breadcrumbs';
import { CasesDeepLinkId } from '../../common/navigation';
import { ConnectorTypes } from '../../../common/types/domain';
import { ObservableTypes } from '../observable_types';
import { AutomaticClosureSwitch } from './automatic_closure_switch';
import { SettingsSection } from './settings_section';
import { ConfigureCasesAppHeader } from './configure_cases_app_header';
import { OldCustomFieldsAndTemplatesSection } from './old_custom_fields_and_templates_section';
import * as observableTypesI18n from '../observable_types/translations';

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

export const ConfigureCasesRedesign: React.FC = React.memo(() => {
  useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure);
  const { euiTheme } = useEuiTheme();
  const { permissions, owner } = useCasesContext();
  const { docLinks } = useKibana().services;

  const {
    hasMinimumLicensePermissions,
    hasMinimumLicensePermissionsForObservables,
    isObservablesFeatureEnabled,
    isExtractObservablesEnabled,
    isExternalSyncEnabled,
    configurationId,
    configurationVersion,
    closureType,
    connector,
    mappings,
    customFields,
    templates,
    observableTypes,
    extractObservables,
    externalSync,
    externalSyncFields,
    externalSyncFieldMappings,
    isPersistingConfiguration,
    isLoadingCaseConfiguration,
    isFetchingCaseConfiguration,
    isConfigurationFetchError,
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
    onChangeExtractObservables,
    onChangeExternalSync,
    onChangeExternalSyncFields,
    onChangeExternalSyncFieldMappings,
    ConnectorAddFlyout,
    ConnectorEditFlyout,
    onEditObservableType,
    onDeleteObservableType,
    AddOrEditObservableTypeFlyout,
  } = useConfigureCasesController<LegacyFlyoutType>();

  const showObservableTypesSection =
    hasMinimumLicensePermissionsForObservables && isObservablesFeatureEnabled;
  const showExtractObservablesSection = showObservableTypesSection && isExtractObservablesEnabled;
  const syncControlsDisabled =
    isPersistingConfiguration ||
    isLoadingCaseConfiguration ||
    isFetchingCaseConfiguration ||
    isConfigurationFetchError ||
    !permissions.settings;

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
              <EuiPanel hasBorder paddingSize="m" data-test-subj="cases-settings-panel">
                {hasMinimumLicensePermissions && (
                  <SettingsSection
                    data-test-subj="cases-external-incident-management-section"
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
                      hideMappings={isExternalSyncEnabled}
                      isLoading={isLoadingAny}
                      mappings={mappings}
                      onChangeConnector={onChangeConnector}
                      selectedConnector={connector}
                      updateConnectorDisabled={updateConnectorDisabled || !permissions.settings}
                      onAddNewConnector={onAddNewConnector}
                    />
                    {isExternalSyncEnabled && (
                      <div data-test-subj="cases-redesign-external-sync-section">
                        <EuiSpacer size="l" />
                        {connector.type !== ConnectorTypes.none ? (
                          <>
                            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                              <EuiFlexItem grow={false}>
                                <EuiTitle size="xs">
                                  <h3>{configureCasesI18n.EXTERNAL_SYNC_TITLE(connector.name)}</h3>
                                </EuiTitle>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <ExperimentalBadge data-test-subj="external-sync-tech-preview-badge" />
                              </EuiFlexItem>
                            </EuiFlexGroup>
                            <EuiSpacer size="xs" />
                            <EuiText size="s" color="subdued">
                              <p>{configureCasesI18n.EXTERNAL_SYNC_DESC(connector.name)}</p>
                            </EuiText>
                            <EuiSpacer size="m" />
                            <SyncSettings
                              value={externalSync}
                              disabled={syncControlsDisabled}
                              onChange={onChangeExternalSync}
                            />
                            <EuiSpacer size="l" />
                            <FieldSyncTable
                              connector={connector}
                              mappings={mappings}
                              rules={externalSyncFields}
                              disabled={syncControlsDisabled}
                              onChange={onChangeExternalSyncFields}
                            />
                            {EXTERNAL_SYNC_FREE_FORM_CONNECTOR_TYPES.has(connector.type) && (
                              <>
                                <EuiSpacer size="l" />
                                <ExternalFieldMappingTable
                                  connector={connector}
                                  owner={owner[0]}
                                  mappings={mappings}
                                  value={externalSyncFieldMappings}
                                  disabled={syncControlsDisabled}
                                  onChange={onChangeExternalSyncFieldMappings}
                                />
                              </>
                            )}
                          </>
                        ) : (
                          <EuiText
                            size="s"
                            color="subdued"
                            data-test-subj="external-sync-no-connector"
                          >
                            {configureCasesI18n.EXTERNAL_SYNC_NO_CONNECTOR}
                          </EuiText>
                        )}
                      </div>
                    )}
                  </SettingsSection>
                )}

                {hasMinimumLicensePermissions && <EuiHorizontalRule margin="l" />}

                {hasMinimumLicensePermissions && (
                  <SettingsSection
                    data-test-subj="cases-case-closures-section"
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

                {showExtractObservablesSection && (
                  <SettingsSection
                    data-test-subj="cases-extract-observables-section"
                    title={configureCasesI18n.EXTRACT_OBSERVABLES_DEFAULT_TITLE}
                    description={configureCasesI18n.EXTRACT_OBSERVABLES_DEFAULT_DESC}
                  >
                    <EuiSwitch
                      label={configureCasesI18n.EXTRACT_OBSERVABLES_DEFAULT_TITLE}
                      checked={extractObservables}
                      onChange={(e) => onChangeExtractObservables(e.target.checked)}
                      disabled={
                        isPersistingConfiguration ||
                        isLoadingCaseConfiguration ||
                        isFetchingCaseConfiguration ||
                        isConfigurationFetchError ||
                        !permissions.settings
                      }
                      data-test-subj="extract-observables-default-switch"
                    />
                  </SettingsSection>
                )}

                {showExtractObservablesSection && <EuiHorizontalRule margin="l" />}

                {showObservableTypesSection && (
                  <SettingsSection
                    data-test-subj="cases-observable-types-section"
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
