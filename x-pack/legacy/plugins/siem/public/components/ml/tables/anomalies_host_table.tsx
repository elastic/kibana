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
import { getAnomaliesHostTableColumnsCurated } from './get_anomalies_host_table_columns';
import { convertAnomaliesToHosts } from './convert_anomalies_to_hosts';
import { BackgroundRefetch, BasicTableContainer } from '../../load_more_table';
import { LoadingPanel } from '../../loading';
import { getIntervalFromAnomalies } from '../anomaly/get_interval_from_anomalies';
import { getSizeFromAnomalies } from '../anomaly/get_size_from_anomalies';
import { AnomaliesHostTableProps } from '../types';
import { hasMlUserPermissions } from '../permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../permissions/ml_capabilities_provider';
import { BasicTable } from './basic_table';
import { hostEquality } from './host_equality';
import { getCriteriaFromHostType } from '../criteria/get_criteria_from_host_type';

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
};

export const AnomaliesHostTable = React.memo<AnomaliesHostTableProps>(
  ({ startDate, endDate, narrowDateRange, hostName, skip, type }): JSX.Element | null => {
    const capabilities = useContext(MlCapabilitiesContext);
    const [loading, tableData] = useAnomaliesTableData({
      startDate,
      endDate,
      skip,
      criteriaFields: getCriteriaFromHostType(type, hostName),
    });

    const hosts = convertAnomaliesToHosts(tableData, hostName);
    const interval = getIntervalFromAnomalies(tableData);
    const columns = getAnomaliesHostTableColumnsCurated(
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
                  data-test-subj="anomalies-host-table-loading-panel"
                />
              </>
            )}
            <HeaderPanel
              subtitle={`${i18n.SHOWING}: ${hosts.length.toLocaleString()} ${i18n.ANOMALIES}`}
              title={i18n.ANOMALIES}
            />
            <BasicTable items={hosts} columns={columns} pagination={pagination} sorting={sorting} />
          </BasicTableContainer>
        </EuiPanel>
      );
    }
  },
  hostEquality
);
