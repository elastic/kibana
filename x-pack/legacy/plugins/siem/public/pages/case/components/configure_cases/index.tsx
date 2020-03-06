/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';

import { SectionWrapper } from '../wrappers';
import { Connectors } from '../configure_cases/connectors';
import { ClosureOptions } from '../configure_cases/closure_options';
import { FieldMapping } from '../configure_cases/field_mapping';
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

const ConfigureCasesComponent: React.FC = () => {
  const { loading: isLoadingConnectors, connectors, refetchConnectors } = useConnectors();

  return (
    <FormWrapper>
      <SectionWrapper>
        <Connectors connectors={connectors ?? []} isLoading={isLoadingConnectors} />
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
