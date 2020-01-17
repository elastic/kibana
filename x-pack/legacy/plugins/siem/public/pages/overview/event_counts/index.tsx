/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { esFilters, IIndexPattern, Query } from 'src/plugins/data/public';
import styled from 'styled-components';

import { OverviewHost } from '../../../components/page/overview/overview_host';
import { OverviewNetwork } from '../../../components/page/overview/overview_network';
import { useKibana } from '../../../lib/kibana';
import { convertToBuildEsQuery } from '../../../lib/keury';
import { esQuery } from '../../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../../store';

const HorizontalSpacer = styled(EuiFlexItem)`
  width: 24px;
`;

const NO_FILTERS: esFilters.Filter[] = [];
const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };

interface Props {
  filters?: esFilters.Filter[];
  from: number;
  indexPattern: IIndexPattern;
  query?: Query;
  setQuery: (params: {
    id: string;
    inspect: inputsModel.InspectQuery | null;
    loading: boolean;
    refetch: inputsModel.Refetch;
  }) => void;
  to: number;
}

export const EventCounts = React.memo<Props>(
  ({ filters = NO_FILTERS, from, indexPattern, query = DEFAULT_QUERY, setQuery, to }) => {
    const kibana = useKibana();

    return (
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={true}>
          <OverviewHost
            endDate={to}
            filterQuery={convertToBuildEsQuery({
              config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
              indexPattern,
              queries: [query],
              filters,
            })}
            startDate={from}
            setQuery={setQuery}
          />
        </EuiFlexItem>

        <HorizontalSpacer grow={false} />

        <EuiFlexItem grow={true}>
          <OverviewNetwork
            endDate={to}
            filterQuery={convertToBuildEsQuery({
              config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
              indexPattern,
              queries: [query],
              filters,
            })}
            startDate={from}
            setQuery={setQuery}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

EventCounts.displayName = 'EventCounts';
