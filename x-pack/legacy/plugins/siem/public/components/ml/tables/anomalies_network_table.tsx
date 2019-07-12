/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiPanel } from '@elastic/eui';
import { useAnomaliesTableData } from '../anomaly/use_anomalies_table_data';
import { HeaderPanel } from '../../header_panel';

import * as i18n from './translations';
import { convertAnomaliesToNetwork } from './convert_anomalies_to_network';
import { BackgroundRefetch, BasicTableContainer } from '../../load_more_table';
import { LoadingPanel } from '../../loading';
import { AnomaliesNetworkTableProps } from '../types';
import { getAnomaliesNetworkTableColumnsCurated } from './get_anomalies_network_table_columns';
import { getIntervalFromAnomalies } from '../anomaly/get_interval_from_anomalies';
import { getSizeFromAnomalies } from '../anomaly/get_size_from_anomalies';
import { hasMlUserPermissions } from '../permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../permissions/ml_capabilities_provider';
import { BasicTable } from './basic_table';
import { networkEquality } from './network_equality';
import { getCriteriaFromNetworkType } from '../criteria/get_criteria_from_network_type';

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
};

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
      pageIndex: 0,
      pageSize: 10,
      totalItemCount: getSizeFromAnomalies(tableData),
      pageSizeOptions: [5, 10, 20, 50],
      hidePerPageOptions: false,
    };
    if (!hasMlUserPermissions(capabilities)) {
      return null;
    } else {
      return (
        <EuiPanel>
          <BasicTableContainer>
            {loading && (
              <>
                <BackgroundRefetch />
                <LoadingPanel
                  height="100%"
                  width="100%"
                  text={`${i18n.LOADING} ${i18n.ANOMALIES}`}
                  position="absolute"
                  zIndex={3}
                  data-test-subj="anomalies-network-table-loading-panel"
                />
              </>
            )}
            <HeaderPanel
              subtitle={`${i18n.SHOWING}: ${networks.length.toLocaleString()} ${i18n.ANOMALIES}`}
              title={i18n.ANOMALIES}
            />
            <BasicTable
              items={networks}
              columns={columns}
              pagination={pagination}
              sorting={sorting}
            />
          </BasicTableContainer>
        </EuiPanel>
      );
    }
  },
  networkEquality
);
