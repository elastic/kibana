/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiInMemoryTable, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
import { useAnomaliesTableData } from './use_anomalies_table_data';
import { HeaderPanel } from '../header_panel';

import * as i18n from './translations';
import { getAnomaliesTableColumns } from './get_anomalies_table_columns';
import { convertAnomaliesToHosts } from './convert_anomalies_to_hosts';
import { BackgroundRefetch } from '../load_more_table';
import { LoadingPanel } from '../loading';

const BasicTableContainer = styled.div`
  position: relative;
`;

const sorting = {
  sort: {
    field: 'anomaly.severity',
    direction: 'desc',
  },
};

const pagination = {
  pageIndex: 0,
  pageSize: 10,
  totalItemCount: 1000,
  pageSizeOptions: [5, 10, 20, 50],
  hidePerPageOptions: false,
};

interface Props {
  startDate: number;
  endDate: number;
}

const columns = getAnomaliesTableColumns();

export const AnomaliesTable = React.memo<Props>(
  ({ startDate, endDate }): JSX.Element => {
    const [loading, tableData] = useAnomaliesTableData({
      influencers: [],
      startDate,
      endDate,
      threshold: 0,
    });
    const hosts = convertAnomaliesToHosts(tableData);
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
                data-test-subj="anomalies-table-loading-panel"
              />
            </>
          )}
          <HeaderPanel
            subtitle={`${i18n.SHOWING}: ${hosts.length.toLocaleString()} ${i18n.ANOMALIES}`}
            title={i18n.ANOMALIES}
          />
          <EuiInMemoryTable
            items={hosts}
            columns={columns}
            pagination={pagination}
            sorting={sorting}
          />
        </BasicTableContainer>
      </EuiPanel>
    );
  }
);
