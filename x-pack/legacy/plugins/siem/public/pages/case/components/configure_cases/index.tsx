/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useCallback, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { noop, isEmpty } from 'lodash/fp';
import { useConnectors } from '../../../../containers/case/configure/use_connectors';
import { useCaseConfigure } from '../../../../containers/case/configure/use_configure';
import {
  ClosureType,
  CasesConfigurationMapping,
  CasesConfigurationMaps,
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

const ConfigureCasesComponent: React.FC = () => {
  const [{ connectorId, closureType, mappings }, dispatch] = useReducer(

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

  const handleSubmit = useCallback(
    // TO DO give a warning/error to user when field are not mapped so they have chance to do it
    async () =>
      // eslint-disable-next-line no-return-await
      await Promise.all([
        persistCaseConfigure({ connectorId, closureType }),
        updateConnector(connectorId, mapping ?? []),
      ]),
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
        myMapping.map((m: CasesConfigurationMaps) => ({
          source: m.source,
          target: m.target,
          actionType: m.action_type,
        }))
      );
    }
  }, [connectors, connectorId]);

  useEffect(() => {
    const resetConnectorToDefaultState = async () => {
      if (
        !isLoadingConnectors &&
        connectorId !== 'none' &&
        !connectors.some(c => c.id === connectorId)
      ) {
        await persistCaseConfigure({
          connectorId: initialState.connectorId,
          closureType: initialState.closureType,
        });
      }
    };

    resetConnectorToDefaultState();
  }, [connectors, connectorId]);

  return (
    <FormWrapper>
      <SectionWrapper>
        <Connectors
          connectors={connectors ?? []}
          disabled={persistLoading || isLoadingConnectors}
          isLoading={isLoadingConnectors}
          onChangeConnector={setConnectorId}
          refetchConnectors={refetchConnectors}
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
          disabled={
            isEmpty(connectors) ||
            connectorId === 'none' ||
            loadingCaseConfigure ||
            persistLoading ||
            isLoadingConnectors
          }
          mapping={mapping}
          onChangeMapping={setMapping}
        />
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
              isDisabled={persistLoading || loadingCaseConfigure}
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
              isDisabled={persistLoading || loadingCaseConfigure}
              isLoading={persistLoading}
              onClick={handleSubmit}
            >
              {i18n.SAVE_CHANGES}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </SectionWrapper>
    </FormWrapper>
  );
};

export const ConfigureCases = React.memo(ConfigureCasesComponent);
