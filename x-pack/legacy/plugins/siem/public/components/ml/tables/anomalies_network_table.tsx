/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { HeaderSection } from '../../header_section';

import * as i18n from './translations';
import { convertAnomaliesToNetwork } from './convert_anomalies_to_network';
import { Loader } from '../../loader';
import { AnomaliesNetworkTableProps } from '../types';
import { getAnomaliesNetworkTableColumnsCurated } from './get_anomalies_network_table_columns';
import { getIntervalFromAnomalies } from '../anomaly/get_interval_from_anomalies';
import { hasMlUserPermissions } from '../permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../permissions/ml_capabilities_provider';
import { BasicTable } from './basic_table';
import { networkEquality } from './network_equality';
import { getCriteriaFromNetworkType } from '../criteria/get_criteria_from_network_type';
import { Panel } from '../../panel';

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
} as const;

export const AnomaliesNetworkTable = React.memo<AnomaliesNetworkTableProps>(
  ({ startDate, endDate, narrowDateRange, skip, ip, type, flowTarget }): JSX.Element | null => {
    const capabilities = useContext(MlCapabilitiesContext);
    const [loading, tableData] = useAnomaliesTableData({
      startDate,
      endDate,
      skip,
      criteriaFields: getCriteriaFromNetworkType(type, ip, flowTarget),
    });

    const networks = convertAnomaliesToNetwork(tableData, ip);
    const interval = getIntervalFromAnomalies(tableData);
    const columns = getAnomaliesNetworkTableColumnsCurated(
      type,
      startDate,
      endDate,
      interval,
      narrowDateRange
    );
    const pagination = {
      initialPageIndex: 0,
      initialPageSize: 10,
      totalItemCount: networks.length,
      pageSizeOptions: [5, 10, 20, 50],
      hidePerPageOptions: false,
    };

    if (!hasMlUserPermissions(capabilities)) {
      return null;
    } else {
      return (
        <Panel loading={loading}>
          <HeaderSection
            subtitle={`${i18n.SHOWING}: ${pagination.totalItemCount.toLocaleString()} ${i18n.UNIT(
              pagination.totalItemCount
            )}`}
            title={i18n.ANOMALIES}
            tooltip={i18n.TOOLTIP}
          />

          <BasicTable
            // @ts-ignore the Columns<T, U> type is not as specific as EUI's...
            columns={columns}
            compressed
            // @ts-ignore ...which leads to `networks` not "matching" the columns
            items={networks}
            pagination={pagination}
            sorting={sorting}
          />

          {loading && (
            <Loader data-test-subj="anomalies-network-table-loading-panel" overlay size="xl" />
          )}
        </Panel>
      );
    }
  },
  networkEquality
);

AnomaliesNetworkTable.displayName = 'AnomaliesNetworkTable';
