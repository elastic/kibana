/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { ActionConnectorTableItem } from '@kbn/triggers-actions-ui-plugin/public/types';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  ActionConnector,
  CaseStatusConfiguration,
  CaseStatusesConfiguration,
  CaseStatuses,
  ObservableTypeConfiguration,
} from '../../../common/types/domain';
import { getNoneConnector } from '../../../common/utils/connectors';
import { getBuiltInStatuses, getEffectiveStatuses } from '../../../common/utils/statuses';
import { useStatusConfigurationEditedEBT } from '../../analytics/statuses';
import type { StatusConfigurationAction } from '../../analytics/statuses';
import { useKibana } from '../../common/lib/kibana';
import { useGetActionTypes } from '../../containers/configure/use_action_types';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { usePersistConfiguration } from '../../containers/configure/use_persist_configuration';
import type { ClosureType } from '../../containers/configure/types';
import { normalizeActionConnector, normalizeCaseConnector } from './utils';
import { getConnectorById } from '../utils';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useLicense } from '../../common/use_license';
import { useCasesFeatures } from '../../common/use_cases_features';
import { CommonFlyout } from './flyout';
import { ObservableTypesForm } from '../observable_types/form';
import { StatusForm } from './statuses/status_form';
import type { StatusFormData } from './statuses/status_form';
import {
  generateStatusKey,
  moveStatus,
  setDefaultStatus,
  toggleStatusDisabled,
  upsertStatus,
} from './statuses/utils';
import * as statusesI18n from './statuses/translations';
import * as i18n from './translations';

export interface ConfigureCasesFlyout<ExtraFlyoutType extends string = never> {
  type: 'addConnector' | 'editConnector' | 'observableTypes' | 'statuses' | ExtraFlyoutType;
  visible: boolean;
}

interface StatusFlyoutState {
  category: CaseStatuses;
  /** The status being renamed; null when adding one to `category` */
  status: CaseStatusConfiguration | null;
}

/**
 * Shared state and handlers for the connector, closure-type, and observable-types
 * sections of the case settings page. Callers that need additional flyout types of
 * their own (e.g. the legacy page's custom fields and templates flyouts) can pass those
 * as the `ExtraFlyoutType` generic so `setFlyOutVisibility` stays the single source of
 * truth for "which flyout is open".
 */
export const useConfigureCasesController = <ExtraFlyoutType extends string = never>() => {
  const { permissions } = useCasesContext();
  const { triggersActionsUi } = useKibana().services;
  const license = useLicense();
  const hasMinimumLicensePermissions = license.isAtLeastGold();
  const hasMinimumLicensePermissionsForObservables = license.isAtLeastPlatinum();
  const { isObservablesFeatureEnabled, isExtractObservablesEnabled } = useCasesFeatures();

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [flyOutVisibility, setFlyOutVisibility] =
    useState<ConfigureCasesFlyout<ExtraFlyoutType> | null>(null);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );
  const [observableTypeToEdit, setObservableTypeToEdit] =
    useState<ObservableTypeConfiguration | null>(null);
  const [statusFlyout, setStatusFlyout] = useState<StatusFlyoutState | null>(null);
  const reportStatusConfigurationEdited = useStatusConfigurationEditedEBT();

  const {
    data: currentConfiguration,
    isLoading: loadingCaseConfigure,
    isFetching: isFetchingCaseConfigure,
    isError: isErrorCaseConfigure,
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
    extractObservables,
    statuses: configuredStatuses,
  } = currentConfiguration;
  const statuses = useMemo(() => getEffectiveStatuses(configuredStatuses), [configuredStatuses]);

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

  const onCloseAddFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'addConnector', visible: false });
  }, []);

  const onCloseEditFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'editConnector', visible: false });
  }, []);

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

  const onChangeExtractObservables = useCallback(
    (value: boolean) => {
      persistCaseConfigure({
        connector,
        customFields,
        templates,
        id: configurationId,
        version: configurationVersion,
        closureType,
        extractObservables: value,
      });
    },
    [
      configurationId,
      configurationVersion,
      closureType,
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

  const persistStatuses = useCallback(
    (
      updatedStatuses: CaseStatusesConfiguration,
      category: CaseStatuses,
      action: StatusConfigurationAction
    ) => {
      persistCaseConfigure(
        {
          connector,
          id: configurationId,
          version: configurationVersion,
          closureType,
          customFields,
          templates,
          observableTypes,
          statuses: updatedStatuses,
        },
        { onSuccess: () => reportStatusConfigurationEdited({ category, action }) }
      );
    },
    [
      closureType,
      configurationId,
      configurationVersion,
      connector,
      customFields,
      observableTypes,
      persistCaseConfigure,
      reportStatusConfigurationEdited,
      templates,
    ]
  );

  const onAddStatus = useCallback((category: CaseStatuses) => {
    setStatusFlyout({ category, status: null });
    setFlyOutVisibility({ type: 'statuses', visible: true });
  }, []);

  const onEditStatus = useCallback(
    (key: string) => {
      const status = statuses.find((item) => item.key === key);

      if (status) {
        setStatusFlyout({ category: status.category, status });
        setFlyOutVisibility({ type: 'statuses', visible: true });
      }
    },
    [statuses]
  );

  const onMoveStatus = useCallback(
    (key: string, direction: 'up' | 'down') => {
      const status = statuses.find((item) => item.key === key);

      if (status) {
        persistStatuses(moveStatus(statuses, key, direction), status.category, 'reordered');
      }
    },
    [persistStatuses, statuses]
  );

  const onSetDefaultStatus = useCallback(
    (key: string) => {
      const status = statuses.find((item) => item.key === key);

      if (status) {
        persistStatuses(setDefaultStatus(statuses, key), status.category, 'default_changed');
      }
    },
    [persistStatuses, statuses]
  );

  const onToggleStatusDisabled = useCallback(
    (key: string) => {
      const status = statuses.find((item) => item.key === key);

      if (status) {
        persistStatuses(
          toggleStatusDisabled(statuses, key),
          status.category,
          status.disabled ? 'enabled' : 'disabled'
        );
      }
    },
    [persistStatuses, statuses]
  );

  const onCloseStatusFlyout = useCallback(() => {
    setFlyOutVisibility({ type: 'statuses', visible: false });
    setStatusFlyout(null);
  }, []);

  const onStatusSave = useCallback(
    ({ label }: StatusFormData) => {
      if (!statusFlyout) {
        return;
      }

      const trimmedLabel = label.trim();
      const status: CaseStatusConfiguration = statusFlyout.status
        ? { ...statusFlyout.status, label: trimmedLabel }
        : {
            key: generateStatusKey(
              trimmedLabel,
              statuses.map((item) => item.key)
            ),
            label: trimmedLabel,
            category: statusFlyout.category,
            order: statuses.length,
            isDefault: false,
            disabled: false,
          };

      persistStatuses(
        upsertStatus(statuses, status),
        statusFlyout.category,
        statusFlyout.status ? 'renamed' : 'added'
      );
      onCloseStatusFlyout();
    },
    [onCloseStatusFlyout, persistStatuses, statusFlyout, statuses]
  );

  const AddOrEditStatusFlyout =
    statusFlyout && flyOutVisibility?.type === 'statuses' && flyOutVisibility?.visible ? (
      <CommonFlyout<StatusFormData>
        isLoading={isLoadingCaseConfiguration}
        disabled={!permissions.settings || isLoadingCaseConfiguration}
        onCloseFlyout={onCloseStatusFlyout}
        onSaveField={onStatusSave}
        renderHeader={() => (
          <span>
            {statusFlyout.status
              ? statusesI18n.EDIT_STATUS
              : statusesI18n.ADD_STATUS_UNDER(
                  getBuiltInStatuses().find((item) => item.category === statusFlyout.category)
                    ?.label ?? statusFlyout.category
                )}
          </span>
        )}
      >
        {({ onChange }) => (
          <StatusForm
            onChange={onChange}
            status={statusFlyout.status}
            categoryLabel={
              getBuiltInStatuses().find((item) => item.category === statusFlyout.category)?.label ??
              statusFlyout.category
            }
            takenLabels={statuses
              .filter(
                (item) =>
                  item.category === statusFlyout.category && item.key !== statusFlyout.status?.key
              )
              .map((item) => item.label)}
          />
        )}
      </CommonFlyout>
    ) : null;

  const AddOrEditObservableTypeFlyout =
    flyOutVisibility?.type === 'observableTypes' && flyOutVisibility?.visible ? (
      <CommonFlyout<ObservableTypeConfiguration>
        isLoading={isLoadingCaseConfiguration}
        disabled={!permissions.settings || isLoadingCaseConfiguration}
        onCloseFlyout={onCloseObservableTypesFlyout}
        onSaveField={onObservableTypeSave}
        renderHeader={() => (
          <span>{observableTypeToEdit ? i18n.EDIT_OBSERVABLE_TYPE : i18n.ADD_OBSERVABLE_TYPE}</span>
        )}
      >
        {({ onChange }) => (
          <ObservableTypesForm onChange={onChange} initialValue={observableTypeToEdit} />
        )}
      </CommonFlyout>
    ) : null;

  return {
    hasMinimumLicensePermissions,
    hasMinimumLicensePermissionsForObservables,
    isObservablesFeatureEnabled,
    isExtractObservablesEnabled,
    configurationId,
    configurationVersion,
    closureType,
    connector,
    mappings,
    customFields,
    templates,
    observableTypes,
    extractObservables,
    isPersistingConfiguration,
    isLoadingCaseConfiguration,
    isFetchingCaseConfiguration: isFetchingCaseConfigure,
    isConfigurationFetchError: isErrorCaseConfigure,
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
    ConnectorAddFlyout,
    ConnectorEditFlyout,
    onEditObservableType,
    onDeleteObservableType,
    AddOrEditObservableTypeFlyout,
    statuses,
    onAddStatus,
    onEditStatus,
    onMoveStatus,
    onSetDefaultStatus,
    onToggleStatusDisabled,
    AddOrEditStatusFlyout,
  };
};

export type UseConfigureCasesController = ReturnType<typeof useConfigureCasesController>;
