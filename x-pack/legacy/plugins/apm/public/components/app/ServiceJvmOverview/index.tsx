/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ManagedTable } from '../../shared/ManagedTable';
import { useFetcher } from '../../../hooks/useFetcher';
import { callApmApi } from '../../../services/rest/callApmApi';
import { asDynamicBytes, asInteger } from '../../../utils/formatters';
import { ServiceNodeMetricOverviewLink } from '../../shared/Links/apm/ServiceNodeMetricOverviewLink';

const ServiceJvmOverview = () => {
  const { uiFilters, urlParams } = useUrlParams();
  const { serviceName, start, end, sortField, sortDirection } = urlParams;

  const localFiltersConfig: React.ComponentProps<
    typeof LocalUIFilters
  > = useMemo(
    () => ({
      filterNames: ['host', 'containerId', 'podName'],
      params: {
        serviceName
      },
      projection: PROJECTION.JVMS
    }),
    [serviceName]
  );

  const { data: items } = useFetcher(() => {
    if (!serviceName || !start || !end) {
      return;
    }
    return callApmApi({
      pathname: '/api/apm/services/{serviceName}/jvms',
      params: {
        path: {
          serviceName
        },
        query: {
          start,
          end,
          uiFilters: JSON.stringify(uiFilters),
          sortField,
          sortDirection
        }
      }
    });
  }, [end, serviceName, start, uiFilters, sortField, sortDirection]);

  if (!serviceName) {
    return null;
  }

  const columns = [
    {
      name: i18n.translate('xpack.apm.jvmsTable.nameColumnLabel', {
        defaultMessage: 'Name'
      }),
      field: 'name',
      sortable: true,
      render: (name: string) => {
        return (
          <ServiceNodeMetricOverviewLink
            serviceName={serviceName}
            serviceNodeName={name}
          >
            {name}
          </ServiceNodeMetricOverviewLink>
        );
      }
    },
    {
      name: i18n.translate('xpack.apm.jvmsTable.cpuColumnLabel', {
        defaultMessage: 'CPU'
      }),
      field: 'cpu',
      sortable: true,
      render: (cpu: number) => {
        return asDynamicBytes(cpu);
      }
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
            items={items || []}
            columns={columns}
            initialPageSize={10}
            initialSortField="name"
            initialSortDirection="desc"
            sortItems={false}
            hidePerPageOptions={false}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { ServiceJvmOverview };
