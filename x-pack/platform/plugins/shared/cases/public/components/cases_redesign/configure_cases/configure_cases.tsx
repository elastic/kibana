/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiCallOut,
  EuiHorizontalRule,
  EuiLink,
  EuiPageBody,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

import type { ActionConnectorTableItem } from '@kbn/triggers-actions-ui-plugin/public/types';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { ActionConnector, ObservableTypeConfiguration } from '../../../../common/types/domain';
import { getNoneConnector } from '../../../../common/utils/connectors';
import { useKibana } from '../../../common/lib/kibana';
import { useGetActionTypes } from '../../../containers/configure/use_action_types';
import { useGetCaseConfiguration } from '../../../containers/configure/use_get_case_configuration';
import type { ClosureType } from '../../../containers/configure/types';
import { Connectors } from '../../configure_cases/connectors';
import { normalizeActionConnector, normalizeCaseConnector } from '../../configure_cases/utils';
import * as configureCasesI18n from '../../configure_cases/translations';
import { getConnectorById } from '../../utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesBreadcrumbs } from '../../use_breadcrumbs';
import { CasesDeepLinkId } from '../../../common/navigation';
import { CommonFlyout } from '../../configure_cases/flyout';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';
import { usePersistConfiguration } from '../../../containers/configure/use_persist_configuration';
import { useLicense } from '../../../common/use_license';
import { ObservableTypes } from '../../observable_types';
import { ObservableTypesForm } from '../../observable_types/form';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { AutomaticClosureSwitch } from './automatic_closure_switch';
import { SettingsSection } from './settings_section';
import { ConfigureCasesAppHeader } from './components/configure_cases_app_header';
import * as observableTypesI18n from '../../observable_types/translations';

interface Flyout {
  type: 'addConnector' | 'editConnector' | 'observableTypes';
  visible: boolean;
}

const ConfigureCasesBreadcrumbs: React.FC = React.memo(() => {
  useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure);
  return null;
});
ConfigureCasesBreadcrumbs.displayName = 'ConfigureCasesBreadcrumbs';

const contentWrapperCss = css`
  box-sizing: content-box;
  max-width: 800px;
  width: 100%;
`;

const getFormWrapperCss = (euiTheme: EuiThemeComputed<{}>) => css`
  padding-top: ${euiTheme.size.xl};
  padding-bottom: ${euiTheme.size.xl};
  .euiFlyout {
    z-index: ${Number(euiTheme.levels.navigation) + 1};
  }
`;

const incidentManagementDescription = configureCasesI18n.INCIDENT_MANAGEMENT_SYSTEM_DESC;

export const ConfigureCasesRedesign: React.FC = React.memo(() => {
  const { permissions } = useCasesContext();
  const { triggersActionsUi, docLinks } = useKibana().services;
  const license = useLicense();
  const hasMinimumLicensePermissions = license.isAtLeastGold();
  const hasMinimumLicensePermissionsForObservables = license.isAtLeastPlatinum();
  const { isObservablesFeatureEnabled } = useCasesFeatures();
  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [flyOutVisibility, setFlyOutVisibility] = useState<Flyout | null>(null);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );
  const [observableTypeToEdit, setObservableTypeToEdit] =
    useState<ObservableTypeConfiguration | null>(null);
  const { euiTheme } = useEuiTheme();

  const {
    data: currentConfiguration,
    isLoading: loadingCaseConfigure,
    refetch: refetchCaseConfigure,
  } = useGetCaseConfiguration();

  const {
    id: configurationId,
    version: configurationVersion,
    closureType,
    connector,
    mappings,
    customFields,
    templates,
    observableTypes,
  } = currentConfiguration;

  const {
    mutate: persistCaseConfigure,
    mutateAsync: persistCaseConfigureAsync,
    isLoading: isPersistingConfiguration,
  } = usePersistConfiguration();

  const isLoadingCaseConfiguration = loadingCaseConfigure || isPersistingConfiguration;
  const {
    isLoading: isLoadingConnectors,
    data: connectors = [],
    refetch: refetchConnectors,
  } = useGetSupportedActionConnectors();
  const {
    isLoading: isLoadingActionTypes,
    data: actionTypes = [],
    refetch: refetchActionTypes,
  } = useGetActionTypes();

  const onConnectorUpdated = useCallback(
    async (updatedConnector: ActionConnector) => {
      setEditedConnectorItem(updatedConnector as ActionConnectorTableItem);
      refetchConnectors();
      refetchActionTypes();
      refetchCaseConfigure();
    },
    [refetchActionTypes, refetchCaseConfigure, refetchConnectors]
  );

  const onConnectorCreated = useCallback(
    async (createdConnector: ActionConnector) => {
      const caseConnector = normalizeActionConnector(createdConnector);

      await persistCaseConfigureAsync({
        connector: caseConnector,
        closureType,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
      });

      onConnectorUpdated(createdConnector);
    },
    [
      persistCaseConfigureAsync,
      closureType,
      customFields,
      templates,
      configurationId,
      configurationVersion,
      onConnectorUpdated,
    ]
  );

  const isLoadingAny =
    isLoadingConnectors ||
    isPersistingConfiguration ||
    loadingCaseConfigure ||
    isLoadingActionTypes;
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connector.id === 'none';

  const onClickUpdateConnector = useCallback(() => {
    setFlyOutVisibility({ type: 'editConnector', visible: true });
  }, []);

  const onCloseAddFlyout = useCallback(
    () => setFlyOutVisibility({ type: 'addConnector', visible: false }),
    []
  );

  const onCloseEditFlyout = useCallback(
    () => setFlyOutVisibility({ type: 'editConnector', visible: false }),
    []
  );

  const onAddNewConnector = useCallback(() => {
    setFlyOutVisibility({ type: 'addConnector', visible: true });
  }, []);

  const onChangeConnector = useCallback(
    (id: string) => {
      if (id === 'add-connector') {
        setFlyOutVisibility({ type: 'addConnector', visible: true });
        return;
      }

      const actionConnector = getConnectorById(id, connectors);
      const caseConnector =
        actionConnector != null ? normalizeActionConnector(actionConnector) : getNoneConnector();

      persistCaseConfigure({
        connector: caseConnector,
        closureType,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
      });
    },
    [
      connectors,
      persistCaseConfigure,
      closureType,
      customFields,
      templates,
      configurationId,
      configurationVersion,
    ]
  );

  const onChangeClosureType = useCallback(
    (type: ClosureType) => {
      persistCaseConfigure({
        connector,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
        closureType: type,
      });
    },
    [
      configurationId,
      configurationVersion,
      connector,
      customFields,
      templates,
      persistCaseConfigure,
    ]
  );

  useEffect(() => {
    if (
      !isLoadingConnectors &&
      connector.id !== 'none' &&
      !connectors.some((c) => c.id === connector.id)
    ) {
      setConnectorIsValid(false);
    } else if (
      !isLoadingConnectors &&
      (connector.id === 'none' || connectors.some((c) => c.id === connector.id))
    ) {
      setConnectorIsValid(true);
    }
  }, [connectors, connector, isLoadingConnectors]);

  useEffect(() => {
    if (!isLoadingConnectors && connector.id !== 'none') {
      setEditedConnectorItem(
        normalizeCaseConnector(connectors, connector) as ActionConnectorTableItem
      );
    }
  }, [connectors, connector, isLoadingConnectors]);

  const ConnectorAddFlyout = useMemo(
    () =>
      flyOutVisibility?.type === 'addConnector' && flyOutVisibility?.visible
        ? triggersActionsUi.getAddConnectorFlyout({
            onClose: onCloseAddFlyout,
            featureId: CasesConnectorFeatureId,
            onConnectorCreated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flyOutVisibility]
  );

  const ConnectorEditFlyout = useMemo(
    () =>
      editedConnectorItem && flyOutVisibility?.type === 'editConnector' && flyOutVisibility?.visible
        ? triggersActionsUi.getEditConnectorFlyout({
            connector: editedConnectorItem,
            onClose: onCloseEditFlyout,
            onConnectorUpdated,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connector.id, editedConnectorItem, flyOutVisibility]
  );

  const onEditObservableType = useCallback(
    (key: string) => {
      const selectedObservableType = observableTypes.find((item) => item.key === key);

      if (selectedObservableType) {
        setObservableTypeToEdit(selectedObservableType);
      }
      setFlyOutVisibility({ type: 'observableTypes', visible: true });
    },
    [observableTypes]
  );

  const onDeleteObservableType = useCallback(
    (key: string) => {
      const remainingObservableTypes = observableTypes.filter((field) => field.key !== key);

      persistCaseConfigure({
        connector,
        observableTypes: remainingObservableTypes,
        id: configurationId,
        version: configurationVersion,
        closureType,
        customFields,
        templates,
      });
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      observableTypes,
      persistCaseConfigure,
      customFields,
      templates,
    ]
  );

  const onCloseObservableTypesFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'observableTypes', visible: false });
    setObservableTypeToEdit(null);
  }, []);

  const onObservableTypeSave = useCallback(
    (data: ObservableTypeConfiguration) => {
      const existingObservableIndex = observableTypes.findIndex((item) => item.key === data.key);

      let updatedObservableTypes = [];

      if (existingObservableIndex === -1) {
        updatedObservableTypes = [...structuredClone(observableTypes), data];
      } else {
        updatedObservableTypes = structuredClone(observableTypes);
        updatedObservableTypes[existingObservableIndex] = data;
      }

      persistCaseConfigure({
        connector,
        id: configurationId,
        version: configurationVersion,
        closureType,
        observableTypes: updatedObservableTypes,
        customFields,
        templates,
      });

      onCloseObservableTypesFlyout();
    },
    [
      observableTypes,
      persistCaseConfigure,
      connector,
      configurationId,
      configurationVersion,
      closureType,
      customFields,
      templates,
      onCloseObservableTypesFlyout,
    ]
  );

  const AddOrEditObservableTypeFlyout =
    flyOutVisibility?.type === 'observableTypes' && flyOutVisibility?.visible ? (
      <CommonFlyout<ObservableTypeConfiguration>
        isLoading={loadingCaseConfigure || isPersistingConfiguration}
        disabled={!permissions.settings || loadingCaseConfigure || isPersistingConfiguration}
        onCloseFlyout={onCloseObservableTypesFlyout}
        onSaveField={onObservableTypeSave}
        renderHeader={() => (
          <span>
            {observableTypeToEdit
              ? configureCasesI18n.EDIT_OBSERVABLE_TYPE
              : configureCasesI18n.ADD_OBSERVABLE_TYPE}
          </span>
        )}
      >
        {({ onChange }) => (
          <ObservableTypesForm onChange={onChange} initialValue={observableTypeToEdit} />
        )}
      </CommonFlyout>
    ) : null;

  const showConnectorsSection = hasMinimumLicensePermissions;
  const showClosureSection = hasMinimumLicensePermissions;
  const showObservableTypesSection =
    hasMinimumLicensePermissionsForObservables && isObservablesFeatureEnabled;

  return (
    <EuiPageSection paddingSize="none">
      <ConfigureCasesBreadcrumbs />
      <ConfigureCasesAppHeader />
      <EuiPageBody restrictWidth={false}>
        <div css={getFormWrapperCss(euiTheme)}>
          {showConnectorsSection && !connectorIsValid && (
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
              {showConnectorsSection && (
                <SettingsSection
                  data-test-subj="cases-redesign-external-incident-management-section"
                  title={configureCasesI18n.INCIDENT_MANAGEMENT_SYSTEM_TITLE}
                  description={incidentManagementDescription}
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

              {showConnectorsSection && showClosureSection && <EuiHorizontalRule margin="l" />}

              {showClosureSection && (
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

              {(showConnectorsSection || showClosureSection) && showObservableTypesSection && (
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
                    isRedesign
                    handleAddObservableType={() =>
                      setFlyOutVisibility({ type: 'observableTypes', visible: true })
                    }
                    handleDeleteObservableType={onDeleteObservableType}
                    handleEditObservableType={onEditObservableType}
                  />
                </SettingsSection>
              )}
            </EuiPanel>
          </div>

          <EuiSpacer size="xl" />

          {ConnectorAddFlyout}
          {ConnectorEditFlyout}
          {AddOrEditObservableTypeFlyout}
        </div>
      </EuiPageBody>
    </EuiPageSection>
  );
});

ConfigureCasesRedesign.displayName = 'ConfigureCasesRedesign';

// eslint-disable-next-line import/no-default-export
export { ConfigureCasesRedesign as default };
