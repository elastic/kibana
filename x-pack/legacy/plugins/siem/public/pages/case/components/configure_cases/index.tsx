/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useReducer, useCallback } from 'react';
import styled, { css } from 'styled-components';

import { SectionWrapper } from '../wrappers';
import { Connectors } from '../configure_cases/connectors';
import { ClosureOptions } from '../configure_cases/closure_options';
import { FieldMapping } from '../configure_cases/field_mapping';
import { State, configureCasesReducer } from './reducer';
import { Connector } from '../../../../containers/case/types';
import { useConnectors } from '../../../../containers/case/use_connectors';

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
  connectors: [],
};

const ConfigureCasesComponent: React.FC = () => {
  const [initLoading, setInitLoading] = useState(true);
  const [{ connectors }, dispatch] = useReducer(configureCasesReducer(), initialState);

  const setConnectors = useCallback((newConnectors: Connector[]) => {
    dispatch({
      type: 'setConnectors',
      connectors: newConnectors,
    });
  }, []);

  const [isLoadingConnectors] = useConnectors({ dispatchConnectors: setConnectors });

  return (
    <FormWrapper>
      <SectionWrapper>
        <Connectors connectors={connectors ?? []} />
      </SectionWrapper>
      <SectionWrapper>
        <ClosureOptions />
      </SectionWrapper>
      <SectionWrapper>
        <FieldMapping />
      </SectionWrapper>
    </FormWrapper>
  );
};

export const ConfigureCases = React.memo(ConfigureCasesComponent);
