/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexItem, EuiLoadingSpinner, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { chunk as _chunk } from 'lodash/fp';
import {
  StatItemsComponent,
  StatItemsProps,
  useKpiMatrixStatus,
  StatItems,
} from '../../../../components/stat_items';
import { KpiNetworkData } from '../../../../graphql/types';

import * as i18n from './translations';
import { UpdateDateRange } from '../../../charts/common';

const kipsPerRow = 2;
const kpiWidgetHeight = 228;

const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

interface KpiNetworkProps {
  data: KpiNetworkData;
  from: number;
  id: string;
  loading: boolean;
  to: number;
  narrowDateRange: UpdateDateRange;
}

export const fieldTitleChartMapping: Readonly<StatItems[]> = [
  {
    key: 'UniqueIps',
    index: 2,
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        value: null,
        name: i18n.SOURCE_CHART_LABEL,
        description: i18n.SOURCE_UNIT_LABEL,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'uniqueDestinationPrivateIps',
        value: null,
        name: i18n.DESTINATION_CHART_LABEL,
        description: i18n.DESTINATION_UNIT_LABEL,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    description: i18n.UNIQUE_PRIVATE_IPS,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 2,
  },
];

const fieldTitleMatrixMapping: Readonly<StatItems[]> = [
  {
    key: 'networkEvents',
    index: 0,
    fields: [
      {
        key: 'networkEvents',
        value: null,
        color: euiColorVis1,
      },
    ],
    description: i18n.NETWORK_EVENTS,
    grow: 1,
  },
  {
    key: 'dnsQueries',
    index: 1,
    fields: [
      {
        key: 'dnsQueries',
        value: null,
      },
    ],
    description: i18n.DNS_QUERIES,
  },
  {
    key: 'uniqueFlowId',
    index: 3,
    fields: [
      {
        key: 'uniqueFlowId',
        value: null,
      },
    ],
    description: i18n.UNIQUE_FLOW_IDS,
  },
  {
    key: 'tlsHandshakes',
    index: 4,
    fields: [
      {
        key: 'tlsHandshakes',
        value: null,
      },
    ],
    description: i18n.TLS_HANDSHAKES,
  },
];

const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

FlexGroup.displayName = 'FlexGroup';

export const KpiNetworkBaseComponent = React.memo<{
  fieldsMapping: Readonly<StatItems[]>;
  data: KpiNetworkData;
  id: string;
  from: number;
  to: number;
  narrowDateRange: UpdateDateRange;
}>(({ fieldsMapping, data, id, from, to, narrowDateRange }) => {
  const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(
    fieldsMapping,
    data,
    id,
    from,
    to,
    narrowDateRange
  );

  return (
    <EuiFlexGroup wrap>
      {statItemsProps.map((mappedStatItemProps, idx) => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
});

KpiNetworkBaseComponent.displayName = 'KpiNetworkBaseComponent';

export const KpiNetworkComponent = React.memo<KpiNetworkProps>(
  ({ data, from, id, loading, to, narrowDateRange }) => {
    return loading ? (
      <FlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </FlexGroup>
    ) : (
      <EuiFlexGroup wrap>
        <EuiFlexItem grow={1}>
          {_chunk(kipsPerRow, fieldTitleMatrixMapping).map((mappingsPerLine, idx) => (
            <React.Fragment key={`kpi-network-row-${idx}`}>
              {idx % kipsPerRow === 1 && <EuiSpacer size="l" />}
              <KpiNetworkBaseComponent
                data={data}
                id={id}
                fieldsMapping={mappingsPerLine}
                from={from}
                to={to}
                narrowDateRange={narrowDateRange}
              />
            </React.Fragment>
          ))}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <KpiNetworkBaseComponent
            data={data}
            id={id}
            fieldsMapping={fieldTitleChartMapping}
            from={from}
            to={to}
            narrowDateRange={narrowDateRange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

KpiNetworkComponent.displayName = 'KpiNetworkComponent';
