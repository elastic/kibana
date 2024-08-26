/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import styled from 'styled-components';

export const PatternAccordion = styled(EuiAccordion)`
  .euiAccordion__triggerWrapper {
    padding: 14px ${({ theme }) => theme.eui.euiSize};
    border: 1px solid ${({ theme }) => theme.eui.euiBorderColor};
    border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  }

  .euiAccordion__button:is(:hover, :focus) {
    text-decoration: none;
  }

  .euiAccordion__buttonContent {
    flex-grow: 1;
  }
`;

export const PatternAccordionChildren = styled.div`
  padding: ${({ theme }) => theme.eui.euiSize};
  padding-bottom: 0;
  border: 1px solid ${({ theme }) => theme.eui.euiBorderColor};
  border-radius: 0 0 ${({ theme }) => `${theme.eui.euiBorderRadius} ${theme.eui.euiBorderRadius}`};
  border-top: none;
  width: calc(100% - ${({ theme }) => theme.eui.euiSizeS} * 2);
  margin: auto;
`;
