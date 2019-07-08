/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { EuiSpacer } from '@elastic/eui';
import { chunk as _chunk } from 'lodash/fp';
import {
  StatItemsComponent,
  StatItemsProps,
  useKpiMatrixStatus,
  StatItems,
  KpiValue,
} from '../../../../components/stat_items';
import { KpiNetworkData } from '../../../../graphql/types';
import { fieldTitleMatrixMapping, fieldTitleChartMapping } from './columns';

const kipsPerRow = 2;
const kpiWidgetHeight = 228;

interface KpiNetworkProps {
  data: KpiNetworkData;
  from: number;
  id: string;
  loading: boolean;
  to: number;
}

const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

export const KpiNetworkBaseComponent = ({
  fieldsMapping,
  data,
  id,
  from,
  to,
}: {
  fieldsMapping: Readonly<Array<StatItems<KpiValue>>>;
  data: KpiNetworkData;
  id: string;
  from: number;
  to: number;
}) => {
  const statItemsProps: Readonly<Array<StatItemsProps<KpiValue>>> = useKpiMatrixStatus(
    fieldsMapping,
    data,
    id,
    from,
    to
  );

  return (
    <EuiFlexGroup wrap>
      {statItemsProps.map((mappedStatItemProps, idx) => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
};

export const KpiNetworkComponent = React.memo<KpiNetworkProps>(
  ({ data, from, id, loading, to }) => {
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
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
