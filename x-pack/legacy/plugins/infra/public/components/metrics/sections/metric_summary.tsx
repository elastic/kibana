/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';

import React from 'react';
import euiStyled from '../../../../../../common/eui_styled_components';

interface Props {
  label: string;
  value: string;
}

export const MetricSummaryItem = ({ label, value }: Props) => {
  return (
    <EuiFlexItem style={{ margin: '0.4rem' }} grow={1}>
      <EuiText size="s">{label}</EuiText>
      <EuiTitle size="s">
        <h2 style={{ whiteSpace: 'nowrap' }}>{value}</h2>
      </EuiTitle>
    </EuiFlexItem>
  );
};

export const MetricSummary = euiStyled.div`
  display: flex;
  flex-flow: row wrap;
  border-top: 1px solid #DDD;
  border-bottom: 1px solid #DDD;
  margin: 0.8rem 0;
`;
