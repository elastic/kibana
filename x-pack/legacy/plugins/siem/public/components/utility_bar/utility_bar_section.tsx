/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

const Section = styled(EuiFlexItem).attrs({
  className: 'siemUtilityBar__section',
})`
  ${({ theme }) => css`
    display: block;
  `}
`;
Section.displayName = 'Section';

export interface UtilityBarSectionProps {
  children: React.ReactNode;
}

export const UtilityBarSection = React.memo<UtilityBarSectionProps>(({ children }) => (
  <Section grow={false}>{children}</Section>
));
UtilityBarSection.displayName = 'UtilityBarSection';
