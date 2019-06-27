/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { KueryBar } from '../KueryBar';
import { DatePicker } from '../DatePicker';
import { EnvironmentFilter } from '../EnvironmentFilter';
import { units, px } from '../../../style/variables';

const ApmHeaderWrapper = styled.div`
  background: ${theme.euiColorEmptyShade};
  border-bottom: 1px solid ${theme.euiColorLightShade};
  padding: ${px(units.plus)};
`;

export const ApmHeader: React.FC = ({ children }) => (
  <>
    <ApmHeaderWrapper>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup alignItems="flexStart" gutterSize="s">
        <EuiFlexItem grow={3}>
          <KueryBar />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EnvironmentFilter />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ApmHeaderWrapper>
  </>
);
