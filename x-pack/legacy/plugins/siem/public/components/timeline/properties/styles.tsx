/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText, EuiFlexItem, EuiIcon } from '@elastic/eui';
import styled, { keyframes } from 'styled-components';

const fadeInEffect = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const TimelineProperties = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  user-select: none;
`;
TimelineProperties.displayName = 'TimelineProperties';

export const DatePicker = styled(EuiFlexItem)<{ width: number }>`
  width: ${({ width }) => `${width}px`};
  .euiSuperDatePicker__flexWrapper {
    max-width: none;
    width: auto;
  }
`;
DatePicker.displayName = 'DatePicker';

export const NameField = styled(EuiFieldText)`
  width: 150px;
  margin-right: 5px;
`;
NameField.displayName = 'NameField';

export const DescriptionContainer = styled.div`
  animation: ${fadeInEffect} 0.3s;
  margin-right: 5px;
  min-width: 150px;
`;
DescriptionContainer.displayName = 'DescriptionContainer';

export const ButtonContainer = styled.div<{ animate: boolean }>`
  animation: ${fadeInEffect} ${({ animate }) => (animate ? '0.3s' : '0s')};
`;
ButtonContainer.displayName = 'ButtonContainer';

export const LabelText = styled.div`
  margin-left: 10px;
`;
LabelText.displayName = 'LabelText';

export const StyledStar = styled(EuiIcon)`
  margin-right: 5px;
  cursor: pointer;
`;
StyledStar.displayName = 'StyledStar';

export const Facet = styled.div`
  align-items: center;
  display: inline-flex;
  justify-content: center;
  border-radius: 4px;
  background: #e4e4e4;
  color: #000;
  font-size: 12px;
  line-height: 16px;
  height: 20px;
  min-width: 20px;
  padding-left: 8px;
  padding-right: 8px;
  user-select: none;
`;
Facet.displayName = 'Facet';

export const LockIconContainer = styled(EuiFlexItem)`
  margin-right: 2px;
`;
LockIconContainer.displayName = 'LockIconContainer';
