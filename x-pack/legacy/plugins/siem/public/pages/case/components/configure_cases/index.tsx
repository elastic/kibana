/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { noop, isEmpty } from 'lodash/fp';
import { useKibana } from '../../../../lib/kibana';
import { useConnectors } from '../../../../containers/case/configure/use_connectors';
import { useCaseConfigure } from '../../../../containers/case/configure/use_configure';
import {
  ActionsConnectorsContextProvider,
  ConnectorAddFlyout,
} from '../../../../../../../../plugins/triggers_actions_ui/public';

import {
  ClosureType,
  CasesConfigurationMapping,
  CCMapsCombinedActionAttributes,
} from '../../../../containers/case/configure/types';
import { Connectors } from '../configure_cases/connectors';
import { ClosureOptions } from '../configure_cases/closure_options';
import { Mapping } from '../configure_cases/mapping';
import { SectionWrapper } from '../wrappers';
import { configureCasesReducer, State } from './reducer';
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
};

const actionTypes = [
  {
    id: '.servicenow',
    name: 'ServiceNow',
    enabled: true,
  },
];

const ConfigureCasesComponent: React.FC = () => {
  const [connectorIsValid, setConnectorIsValid] = useState(true);
  const { http, triggers_actions_ui, notifications, application } = useKibana().services;
  const [addFlyoutVisible, setAddFlyoutVisibility] = useState<boolean>(false);

  const handleShowAddFlyout = useCallback(() => setAddFlyoutVisibility(true), []);

  const [{ connectorId, closureType, mapping }, dispatch] = useReducer(
    configureCasesReducer(),
    initialState
  );

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
    setConnectorId,
    setClosureType,
  });
  const {
    loading: isLoadingConnectors,
    connectors,
    refetchConnectors,
    updateConnector,
  } = useConnectors();

  const reloadConnectors = useCallback(async () => refetchConnectors(), []);
  const isLoadingAny = isLoadingConnectors || persistLoading || loadingCaseConfigure;

  const handleSubmit = useCallback(
    // TO DO give a warning/error to user when field are not mapped so they have chance to do it
    () => {
      persistCaseConfigure({ connectorId, closureType });
      updateConnector(connectorId, mapping ?? []);
    },
    [connectorId, closureType, mapping]
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
          handleShowFlyout={handleShowAddFlyout}
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
        <Mapping disabled mapping={mapping} onChangeMapping={setMapping} />
      </SectionWrapper>
      <SectionWrapper>
        <EuiSpacer />
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={false}
              isDisabled={isLoadingAny}
              isLoading={persistLoading}
              onClick={noop} // TO DO redirect to the main page of cases
            >
              {i18n.CANCEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="save"
              isDisabled={isLoadingAny}
              isLoading={persistLoading}
              onClick={handleSubmit}
            >
              {i18n.SAVE_CHANGES}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </SectionWrapper>
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
          setAddFlyoutVisibility={setAddFlyoutVisibility}
          actionTypes={actionTypes}
        />
      </ActionsConnectorsContextProvider>
    </FormWrapper>
  );
};

export const ConfigureCases = React.memo(ConfigureCasesComponent);
