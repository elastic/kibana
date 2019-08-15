/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { loadTraceList } from '../../../services/rest/apm/traces';
import { TraceList } from './TraceList';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useTrackPageview } from '../../../../../infra/public';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';

export function TraceOverview() {
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end } = urlParams;
  const { status, data = [] } = useFetcher(() => {
    if (start && end) {
      return loadTraceList({ start, end, uiFilters });
    }
  }, [start, end, uiFilters]);

  useTrackPageview({ app: 'apm', path: 'traces_overview' });
  useTrackPageview({ app: 'apm', path: 'traces_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionResult', 'host', 'containerId', 'podName'],
      projection: PROJECTION.TRACES
    };

    return config;
  }, []);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <LocalUIFilters {...localUIFiltersConfig}></LocalUIFilters>
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <EuiPanel>
          <TraceList items={data} isLoading={status === FETCH_STATUS.LOADING} />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
