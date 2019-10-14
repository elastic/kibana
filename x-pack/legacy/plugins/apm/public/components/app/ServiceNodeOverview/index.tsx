/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ManagedTable, ITableColumn } from '../../shared/ManagedTable';
import { useFetcher } from '../../../hooks/useFetcher';
import {
  asDynamicBytes,
  asInteger,
  asPercent
} from '../../../utils/formatters';
import { ServiceNodeMetricOverviewLink } from '../../shared/Links/apm/ServiceNodeMetricOverviewLink';
import { truncate, px, unit } from '../../../style/variables';

const INITIAL_PAGE_SIZE = 10;
const INITIAL_SORT_FIELD = 'name';
const INITIAL_SORT_DIRECTION = 'asc';

const ServiceNodeName = styled.div`
  ${truncate(px(8 * unit))}
`;

const ServiceNodeOverview = () => {
  const { uiFilters, urlParams } = useUrlParams();
  const { serviceName, start, end } = urlParams;

  const localFiltersConfig: React.ComponentProps<
    typeof LocalUIFilters
  > = useMemo(
    () => ({
      filterNames: ['host', 'containerId', 'podName'],
      params: {
        serviceName
      },
      projection: PROJECTION.SERVICE_NODES
    }),
    [serviceName]
  );

  const { data: items = [] } = useFetcher(
    callApmApi => {
      if (!serviceName || !start || !end) {
        return undefined;
      }
      return callApmApi({
        pathname: '/api/apm/services/{serviceName}/serviceNodes',
        params: {
          path: {
            serviceName
          },
          query: {
            start,
            end,
            uiFilters: JSON.stringify(uiFilters)
          }
        }
      });
    },
    [serviceName, start, end, uiFilters]
  );

  if (!serviceName) {
    return null;
  }

  const columns: Array<ITableColumn<typeof items[0]>> = [
    {
      name: i18n.translate('xpack.apm.jvmsTable.nameColumnLabel', {
        defaultMessage: 'Name'
      }),
      field: 'name',
      sortable: true,
      render: (name: string) => {
        return (
          <EuiToolTip content={name}>
            <ServiceNodeMetricOverviewLink
              serviceName={serviceName}
              serviceNodeName={name}
            >
              <ServiceNodeName>{name}</ServiceNodeName>
            </ServiceNodeMetricOverviewLink>
          </EuiToolTip>
        );
      }
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.cpuColumnLabel', {
        defaultMessage: 'CPU'
      }),
      field: 'cpu',
      sortable: true,
      render: (value: number | null) => asPercent(value || 0, 1)
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.heapMemoryColumnLabel', {
        defaultMessage: 'Heap memory max'
      }),
      field: 'heapMemory',
      sortable: true,
      render: asDynamicBytes
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.nonHeapMemoryColumnLabel', {
        defaultMessage: 'Non-heap memory max'
      }),
      field: 'nonHeapMemory',
      sortable: true,
      render: asDynamicBytes
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.threadCountColumnLabel', {
        defaultMessage: 'Thread count'
      }),
      field: 'threadCount',
      sortable: true,
      render: asInteger
    }
  ];

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <LocalUIFilters {...localFiltersConfig} />
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <EuiPanel>
          <ManagedTable
            noItemsMessage={i18n.translate('xpack.apm.jvmsTable.noJvmsLabel', {
              defaultMessage: 'No JVMs were found'
            })}
            items={items}
            columns={columns}
            initialPageSize={INITIAL_PAGE_SIZE}
            initialSortField={INITIAL_SORT_FIELD}
            initialSortDirection={INITIAL_SORT_DIRECTION}
            hidePerPageOptions={false}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { ServiceNodeOverview };
