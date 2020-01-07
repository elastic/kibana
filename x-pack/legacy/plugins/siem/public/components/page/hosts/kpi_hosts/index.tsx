/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { KpiHostsData, KpiHostDetailsData } from '../../../../graphql/types';
import { StatItemsComponent, StatItemsProps, useKpiMatrixStatus } from '../../../stat_items';
import { kpiHostsMapping } from './kpi_hosts_mapping';
import { kpiHostDetailsMapping } from './kpi_host_details_mapping';
import { UpdateDateRange } from '../../../charts/common';

const kpiWidgetHeight = 247;

interface GenericKpiHostProps {
  from: number;
  id: string;
  loading: boolean;
  to: number;
  narrowDateRange: UpdateDateRange;
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

FlexGroupSpinner.displayName = 'FlexGroupSpinner';

export const KpiHostsComponentBase = ({
  data,
  from,
  loading,
  id,
  to,
  narrowDateRange,
}: KpiHostsProps | KpiHostDetailsProps) => {
  const mappings =
    (data as KpiHostsData).hosts !== undefined ? kpiHostsMapping : kpiHostDetailsMapping;
  const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(
    mappings,
    data,
    id,
    from,
    to,
    narrowDateRange
  );
  return loading ? (
    <FlexGroupSpinner alignItems="center" justifyContent="center">
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

KpiHostsComponentBase.displayName = 'KpiHostsComponentBase';

export const KpiHostsComponent = React.memo(KpiHostsComponentBase);

KpiHostsComponent.displayName = 'KpiHostsComponent';
