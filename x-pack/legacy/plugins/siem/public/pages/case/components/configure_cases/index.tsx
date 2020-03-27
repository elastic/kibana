/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  useReducer,
  useCallback,
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import styled, { css } from 'styled-components';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiBottomBar,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { isEmpty, difference } from 'lodash/fp';
import { useKibana } from '../../../../lib/kibana';
import { useConnectors } from '../../../../containers/case/configure/use_connectors';
import { useCaseConfigure } from '../../../../containers/case/configure/use_configure';
import {
  ActionsConnectorsContextProvider,
  ActionType,
  ConnectorAddFlyout,
  ConnectorEditFlyout,
} from '../../../../../../../../plugins/triggers_actions_ui/public';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionConnectorTableItem } from '../../../../../../../../plugins/triggers_actions_ui/public/types';
import { getCaseUrl } from '../../../../components/link_to';
import { useGetUrlSearch } from '../../../../components/navigation/use_get_url_search';
import {
  ClosureType,
  CasesConfigurationMapping,
  CCMapsCombinedActionAttributes,
} from '../../../../containers/case/configure/types';
import { Connectors } from '../configure_cases/connectors';
import { ClosureOptions } from '../configure_cases/closure_options';
import { Mapping } from '../configure_cases/mapping';
import { SectionWrapper } from '../wrappers';
import { navTabs } from '../../../../pages/home/home_navigations';
import { configureCasesReducer, State, CurrentConfiguration } from './reducer';
import * as i18n from './translations';

const FormWrapper = styled.div`
  ${({ theme }) => css`
    & > * {
      margin-top 40px;
    }

    padding-top: ${theme.eui.paddingSizes.l};
    padding-bottom: ${theme.eui.paddingSizes.l};
  `}
`;

const initialState: State = {
  connectorId: 'none',
  closureType: 'close-by-user',
  mapping: null,
  currentConfiguration: { connectorId: 'none', closureType: 'close-by-user' },
};

const actionTypes: ActionType[] = [
  {
    id: '.servicenow',
    name: 'ServiceNow',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'platinum',
  },
];

const ConfigureCasesComponent: React.FC = () => {
  const search = useGetUrlSearch(navTabs.case);
  const { http, triggers_actions_ui, notifications, application } = useKibana().services;

  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);
  const [editedConnectorItem, setEditedConnectorItem] = useState<ActionConnectorTableItem | null>(
    null
  );

  const [actionBarVisible, setActionBarVisible] = useState(false);
  const [totalConfigurationChanges, setTotalConfigurationChanges] = useState(0);

  const [{ connectorId, closureType, mapping, currentConfiguration }, dispatch] = useReducer(
    configureCasesReducer(),
    initialState
  );

  const setCurrentConfiguration = useCallback((configuration: CurrentConfiguration) => {
    dispatch({
      type: 'setCurrentConfiguration',
      currentConfiguration: { ...configuration },
    });
  }, []);

  const setConnectorId = useCallback((newConnectorId: string) => {
    dispatch({
      type: 'setConnectorId',
      connectorId: newConnectorId,
    });
  }, []);

  const setClosureType = useCallback((newClosureType: ClosureType) => {
    dispatch({
      type: 'setClosureType',
      closureType: newClosureType,
    });
  }, []);

  const setMapping = useCallback((newMapping: CasesConfigurationMapping[]) => {
    dispatch({
      type: 'setMapping',
      mapping: newMapping,
    });
  }, []);

  const { loading: loadingCaseConfigure, persistLoading, persistCaseConfigure } = useCaseConfigure({
    setConnector: setConnectorId,
    setClosureType,
    setCurrentConfiguration,
  });
  const { loading: isLoadingConnectors, connectors, refetchConnectors } = useConnectors();

  // ActionsConnectorsContextProvider reloadConnectors prop expects a Promise<void>.
  // TODO: Fix it if reloadConnectors type change.
  const reloadConnectors = useCallback(async () => refetchConnectors(), []);
  const isLoadingAny = isLoadingConnectors || persistLoading || loadingCaseConfigure;
  const updateConnectorDisabled = isLoadingAny || !connectorIsValid || connectorId === 'none';

  const handleSubmit = useCallback(
    // TO DO give a warning/error to user when field are not mapped so they have chance to do it
    () => {
      setActionBarVisible(false);
      persistCaseConfigure({
        connectorId,
        connectorName: connectors.find(c => c.id === connectorId)?.name ?? '',
        closureType,
      });
    },
    [connectorId, connectors, closureType, mapping]
  );

  const onClickAddConnector = useCallback(() => {
    setActionBarVisible(false);
    setAddFlyoutVisibility(true);
  }, []);

  const onClickUpdateConnector = useCallback(() => {
    setActionBarVisible(false);
    setEditFlyoutVisibility(true);
  }, []);

  const handleActionBar = useCallback(() => {
    const unsavedChanges = difference(Object.values(currentConfiguration), [
      connectorId,
      closureType,
    ]).length;

    if (unsavedChanges === 0) {
      setActionBarVisible(false);
    } else {
      setActionBarVisible(true);
    }

    setTotalConfigurationChanges(unsavedChanges);
  }, [currentConfiguration, connectorId, closureType]);

  const handleSetAddFlyoutVisibility = useCallback(
    (isVisible: boolean) => {
      handleActionBar();
      setAddFlyoutVisibility(isVisible);
    },
    [currentConfiguration, connectorId, closureType]
  );

  const handleSetEditFlyoutVisibility = useCallback(
    (isVisible: boolean) => {
      handleActionBar();
      setEditFlyoutVisibility(isVisible);
    },
    [currentConfiguration, connectorId, closureType]
  );

  useEffect(() => {
    if (
      !isEmpty(connectors) &&
      connectorId !== 'none' &&
      connectors.some(c => c.id === connectorId)
    ) {
      const myConnector = connectors.find(c => c.id === connectorId);
      const myMapping = myConnector?.config?.casesConfiguration?.mapping ?? [];
      setMapping(
        myMapping.map((m: CCMapsCombinedActionAttributes) => ({
          source: m.source,
          target: m.target,
          actionType: m.action_type ?? m.actionType,
        }))
      );
    }
  }, [connectors, connectorId]);

  useEffect(() => {
    if (
      !isLoadingConnectors &&
      connectorId !== 'none' &&
      !connectors.some(c => c.id === connectorId)
    ) {
      setConnectorIsValid(false);
    } else if (
      !isLoadingConnectors &&
      (connectorId === 'none' || connectors.some(c => c.id === connectorId))
    ) {
      setConnectorIsValid(true);
    }
  }, [connectors, connectorId]);

  useEffect(() => {
    if (!isLoadingConnectors && connectorId !== 'none') {
      setEditedConnectorItem(
        connectors.find(c => c.id === connectorId) as ActionConnectorTableItem
      );
    }
  }, [connectors, connectorId]);

  useEffect(() => {
    handleActionBar();
  }, [connectors, connectorId, closureType, currentConfiguration]);

  return (
    <FormWrapper>
      {!connectorIsValid && (
        <SectionWrapper style={{ marginTop: 0 }}>
          <EuiCallOut title={i18n.WARNING_NO_CONNECTOR_TITLE} color="warning" iconType="help">
            {i18n.WARNING_NO_CONNECTOR_MESSAGE}
          </EuiCallOut>
        </SectionWrapper>
      )}
      <SectionWrapper>
        <Connectors
          connectors={connectors ?? []}
          disabled={persistLoading || isLoadingConnectors}
          isLoading={isLoadingConnectors}
          onChangeConnector={setConnectorId}
          handleShowAddFlyout={onClickAddConnector}
          selectedConnector={connectorId}
        />
      </SectionWrapper>
      <SectionWrapper>
        <ClosureOptions
          closureTypeSelected={closureType}
          disabled={persistLoading || isLoadingConnectors || connectorId === 'none'}
          onChangeClosureType={setClosureType}
        />
      </SectionWrapper>
      <SectionWrapper>
        <Mapping
          disabled
          updateConnectorDisabled={updateConnectorDisabled}
          mapping={mapping}
          onChangeMapping={setMapping}
          setEditFlyoutVisibility={onClickUpdateConnector}
        />
      </SectionWrapper>
      {actionBarVisible && (
        <EuiBottomBar>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiText>{i18n.UNSAVED_CHANGES(totalConfigurationChanges)}</EuiText>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    color="ghost"
                    iconType="cross"
                    isDisabled={isLoadingAny}
                    isLoading={persistLoading}
                    aria-label="Cancel"
                    href={getCaseUrl(search)}
                  >
                    {i18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    color="secondary"
                    iconType="save"
                    aria-label="Save"
                    isDisabled={isLoadingAny}
                    isLoading={persistLoading}
                    onClick={handleSubmit}
                  >
                    {i18n.SAVE_CHANGES}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
      <ActionsConnectorsContextProvider
        value={{
          http,
          actionTypeRegistry: triggers_actions_ui.actionTypeRegistry,
          toastNotifications: notifications.toasts,
          capabilities: application.capabilities,
          reloadConnectors,
        }}
      >
        <ConnectorAddFlyout
          addFlyoutVisible={addFlyoutVisible}
          setAddFlyoutVisibility={handleSetAddFlyoutVisibility as Dispatch<SetStateAction<boolean>>}
          actionTypes={actionTypes}
        />
        {editedConnectorItem && (
          <ConnectorEditFlyout
            key={editedConnectorItem.id}
            initialConnector={editedConnectorItem}
            editFlyoutVisible={editFlyoutVisible}
            setEditFlyoutVisibility={
              handleSetEditFlyoutVisibility as Dispatch<SetStateAction<boolean>>
            }
          />
        )}
      </ActionsConnectorsContextProvider>
    </FormWrapper>
  );
};

export const ConfigureCases = React.memo(ConfigureCasesComponent);
