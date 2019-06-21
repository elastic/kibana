/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { KpiHostsData } from '../../../../graphql/types';
import {
  StatItemsComponent,
  StatItemsProps,
  useKpiMatrixStatus,
  KpiValue,
} from '../../../stat_items';
import { fieldTitleMapping } from './column';

const kpiWidgetHeight = 247;

interface KpiHostsProps {
  data: KpiHostsData;
  loading: boolean;
}

const FlexGroupSpinner = styled(EuiFlexGroup)`
   {
    min-height: ${kpiWidgetHeight}px;
  }
`;

export const KpiHostsComponent = ({ data, loading }: KpiHostsProps) => {
  const statItemsProps: Readonly<Array<StatItemsProps<KpiValue>>> = useKpiMatrixStatus(
    fieldTitleMapping,
    data
  );
  return loading ? (
    <FlexGroupSpinner justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroupSpinner>
  ) : (
    <EuiFlexGroup>
      {statItemsProps.map(mappedStatItemProps => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
};
