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
  useKpiMatrixStatus,
  StatItems,
  StatItemsProps,
  KpiValue,
} from '../../../../components/stat_items';
import { KpiIpDetailsData } from '../../../../graphql/types';
import { fieldTitleMatrixMapping, fieldTitleChartMapping } from './columns';
const kpiWidgetHeight = 228;
const kipsPerRow = 1;

interface KpiIpDetailsProps {
  data: KpiIpDetailsData;
  loading: boolean;
}

const FlexGroup = styled(EuiFlexGroup)`
  min-height: ${kpiWidgetHeight}px;
`;

export const KpiIpDetailsBaseComponent = ({
  fieldsMapping,
  data,
  id,
  from,
  to,
}: {
  fieldsMapping: Array<StatItems<KpiValue>>;
  data: KpiIpDetailsData;
  id: string;
  from: number;
  to: number;
}) => {
  const statItemsProps: Array<StatItemsProps<KpiValue>> = useKpiMatrixStatus(
    fieldsMapping,
    data,
    id,
    from,
    to
  );

  return (
    <EuiFlexGroup wrap>
      {statItemsProps.map(mappedStatItemProps => {
        return <StatItemsComponent {...mappedStatItemProps} />;
      })}
    </EuiFlexGroup>
  );
};

export const KpiIpDetailsComponent = React.memo<KpiIpDetailsProps>(({ data, loading }) => {
  return loading ? (
    <FlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </FlexGroup>
  ) : (
    <EuiFlexGroup wrap>
      <EuiFlexItem grow={1}>
        {_chunk(kipsPerRow, fieldTitleMatrixMapping).map((mappings, idx) => (
          <React.Fragment key={`kpi-ip-details-row-${idx}`}>
            {idx !== 0 && <EuiSpacer size="l" />}
            <KpiIpDetailsBaseComponent data={data} fieldsMapping={mappings} />
          </React.Fragment>
        ))}
      </EuiFlexItem>
      <EuiFlexItem grow={4}>
        <KpiIpDetailsBaseComponent data={data} fieldsMapping={fieldTitleChartMapping} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
