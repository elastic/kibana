/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const EuiFlexItemReducedMargin = styled(EuiFlexItem)`
  && {
    margin-left: 0px;
    margin-right: 0px;
  }
`;

const EuiFlexItemAlignRight = styled(EuiFlexItem)`
  text-align: right;
`;

interface Props {
  color: string;
  message: string;
  content: string | number;
}

export const DonutChartLegendRow = ({ color, content, message }: Props) => (
  <EuiFlexGroup gutterSize="l" responsive={false}>
    <EuiFlexItemReducedMargin component="span" grow={false}>
      <EuiHealth color={color} />
    </EuiFlexItemReducedMargin>
    <EuiFlexItemReducedMargin component="span" grow={false}>
      {message}
    </EuiFlexItemReducedMargin>
    <EuiFlexItemAlignRight component="span">{content}</EuiFlexItemAlignRight>
  </EuiFlexGroup>
);
