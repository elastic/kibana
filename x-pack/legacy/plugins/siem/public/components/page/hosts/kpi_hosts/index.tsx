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
import { KpiHostsData, KpiHostDetailsData } from '../../../../graphql/types';
import { StatItemsComponent, StatItemsProps, useKpiMatrixStatus } from '../../../stat_items';
import { kpiHostsMapping } from './kpi_hosts_mapping';
import { kpiHostDetailsMapping } from './kpi_host_details_mapping';

const kpiWidgetHeight = 247;

interface GenericKpiHostProps {
  from: number;
  id: string;
  loading: boolean;
  to: number;
}

interface KpiHostsProps extends GenericKpiHostProps {
  data: KpiHostsData;
}

interface KpiHostDetailsProps extends GenericKpiHostProps {
  data: KpiHostDetailsData;
}

const FlexGroupSpinner = styled(EuiFlexGroup)`
   {
    min-height: ${kpiWidgetHeight}px;
  }
`;

export const KpiHostsComponent = ({
  data,
  from,
  loading,
  id,
  to,
}: KpiHostsProps | KpiHostDetailsProps) => {
  const mappings =
    (data as KpiHostsData).hosts !== undefined ? kpiHostsMapping : kpiHostDetailsMapping;
  const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(mappings, data, id, from, to);
  return loading ? (
    <FlexGroupSpinner justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroupSpinner>
  ) : (
    <EuiFlexGroup>
      {statItemsProps.map((mappedStatItemProps, idx) => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
};
