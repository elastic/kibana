/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiPanel, EuiTitle, EuiButtonIcon, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React, { useState } from 'react';
import moment from 'moment';
import { withUptimeGraphQL, UptimeGraphQLQueryProps } from '../../higher_order';
import { monitorStatesQuery } from '../../../queries/monitor_states_query';
import { MonitorSummary, MonitorSummaryResult } from '../../../../common/graphql/types';
import { MonitorListStatusColumn } from '../monitor_list_status_column';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { Criteria, Pagination, ExpandedRowMap } from './types';
import { MonitorListDrawer } from './monitor_list_drawer';
import { CLIENT_DEFAULTS } from '../../../../common/constants';

interface MonitorListQueryResult {
  monitorStates?: MonitorSummaryResult;
}

interface MonitorListProps {
  dangerColor: string;
  successColor: string;
  pageIndex: number;
  pageSize: number;
  onChange: (criteria: Criteria) => void;
  sortField: string;
  sortDirection: string;
}

type Props = UptimeGraphQLQueryProps<MonitorListQueryResult> & MonitorListProps;

export const MonitorListComponent = (props: Props) => {
  const {
    dangerColor,
    successColor,
    data,
    errors,
    loading,
    onChange,
    pageIndex,
    pageSize,
    sortDirection,
    sortField,
  } = props;
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);

  const items = get<MonitorSummary[]>(data, 'monitorStates.summaries', []);
  const count = get<number>(data, 'monitorStates.totalSummaryCount.count', 0);

  const pagination: Pagination = {
    pageIndex,
    pageSize,
    pageSizeOptions: [5, 10, 20, 50],
    totalItemCount: count,
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.uptime.monitorList.monitoringStatusTitle"
            defaultMessage="Monitor status"
          />
        </h5>
      </EuiTitle>
      <EuiBasicTable
        error={errors ? formatUptimeGraphQLErrorList(errors) : errors}
        loading={loading}
        isExpandable
        itemId="monitor_id"
        itemIdToExpandedRowMap={drawerIds.reduce((map: ExpandedRowMap, id: string) => {
          return {
            ...map,
            [id]: (
              <MonitorListDrawer
                condensedCheckLimit={CLIENT_DEFAULTS.CONDENSED_CHECK_LIMIT}
                summary={
                  items ? items.find(({ monitor_id: monitorId }) => monitorId === id) : undefined
                }
                successColor={successColor}
                dangerColor={dangerColor}
              />
            ),
          };
        }, {})}
        items={items}
        onChange={onChange}
        noItemsMessage={i18n.translate('xpack.uptime.monitorList.noItemMessage', {
          defaultMessage: 'No uptime monitors found',
          description: 'This message is shown if the monitors table is rendered but has no items.',
        })}
        pagination={pagination}
        sorting={sorting}
        columns={[
          {
            field: 'monitor_id',
            name: '',
            sortable: true,
            width: '40px',
            render: (id: string) => {
              return (
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.uptime.monitorList.expandDrawerButton.ariaLabel',
                    {
                      defaultMessage: 'Expand row for monitor with ID {id}',
                      description:
                        'The user can click a button on this table and expand further details.',
                      values: {
                        id,
                      },
                    }
                  )}
                  iconType={drawerIds.find(item => item === id) ? 'arrowUp' : 'arrowDown'}
                  onClick={() => {
                    if (drawerIds.find(i => id === i)) {
                      updateDrawerIds(drawerIds.filter(p => p !== id));
                    } else {
                      updateDrawerIds([...drawerIds, id]);
                    }
                  }}
                />
              );
            },
          },
          {
            field: 'state.monitor.status',
            name: 'Status',
            render: (status: string, { state: { timestamp } }: MonitorSummary) => {
              const wrappedTimestamp = moment(timestamp);
              return (
                <MonitorListStatusColumn
                  absoluteTime={wrappedTimestamp.toLocaleString()}
                  relativeTime={wrappedTimestamp.fromNow()}
                  status={status}
                />
              );
            },
          },
          {
            field: 'monitor_id',
            name: 'ID',
            sortable: true,
          },
          {
            field: 'state.monitor.name',
            name: 'Name',
          },
          {
            field: 'state.url.full',
            name: 'URL',
            sortable: true,
          },
          {
            field: 'state.url.scheme',
            name: 'Type',
          },
          {
            field: 'state.checks',
            name: 'Checks',
            render: (checks: any[]) => <EuiBadge>{checks.length}</EuiBadge>,
          },
        ]}
      />
    </EuiPanel>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorStatesQuery
);
