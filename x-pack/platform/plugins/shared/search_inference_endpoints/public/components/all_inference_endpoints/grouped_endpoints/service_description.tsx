/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { EuiText } from '@elastic/eui';
import { SERVICE_PROVIDER_DESCRIPTIONS } from '../constants';

const DescriptionContainer = styled.div`
  padding-right: ${({ theme }) => theme.euiTheme.size.m};
`;

export interface ServiceDescriptionProps {
  service: string;
}

export const ServiceDescription = ({ service }: ServiceDescriptionProps) => {
  const description = SERVICE_PROVIDER_DESCRIPTIONS[service];
  if (!description) {
    return null;
  }

  return (
    <DescriptionContainer>
      <EuiText size="s" color="subdued">
        {description}
      </EuiText>
    </DescriptionContainer>
  );
};
