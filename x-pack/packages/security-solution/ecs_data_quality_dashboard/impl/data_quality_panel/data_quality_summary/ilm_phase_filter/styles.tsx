/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormControlLayout } from '@elastic/eui';
import styled from 'styled-components';

export const StyledOption = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
`;

export const StyledOptionLabel = styled.span`
  font-weight: ${({ theme }) => theme.eui.euiFontWeightBold};
`;

export const StyledFormControlLayout = styled(EuiFormControlLayout)`
  height: 42px;

  .euiFormControlLayout__childrenWrapper {
    overflow: visible;
  }
`;
