/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiPanel, EuiTitle, EuiButtonIcon, EuiIcon, EuiLink } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React, { useState, Fragment } from 'react';
import { withUptimeGraphQL, UptimeGraphQLQueryProps } from '../../higher_order';
import { monitorStatesQuery } from '../../../queries/monitor_states_query';
import {
  MonitorSummary,
  MonitorSummaryResult,
  SummaryHistogramPoint,
} from '../../../../common/graphql/types';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { ExpandedRowMap } from './types';
import { MonitorListDrawer } from './monitor_list_drawer';
import { CLIENT_DEFAULTS } from '../../../../common/constants';
import { MonitorBarSeries } from '../charts';
import { MonitorPageLink } from '../monitor_page_link';
import { MonitorListActionsPopover } from './monitor_list_actions_popover';

interface MonitorListQueryResult {
  monitorStates?: MonitorSummaryResult;
}

interface MonitorListProps {
  absoluteStartDate: number;
  absoluteEndDate: number;
  dangerColor: string;
  hasActiveFilters: boolean;
  successColor: string;
  linkParameters?: string;
  // TODO: reintegrate pagination in a future release
  // pageIndex: number;
  // pageSize: number;
  // TODO: reintroduce for pagination and sorting
  // onChange: (criteria: Criteria) => void;
  // TODO: reintegrate sorting in a future release
  // sortField: string;
  // sortDirection: string;
}

type Props = UptimeGraphQLQueryProps<MonitorListQueryResult> & MonitorListProps;

export const MonitorListComponent = (props: Props) => {
  const {
    absoluteStartDate,
    absoluteEndDate,
    dangerColor,
    successColor,
    data,
    errors,
    hasActiveFilters,
    linkParameters,
    loading,
    // TODO: reintroduce for pagination and sorting
    // onChange,
    // TODO: reintegrate pagination in future release
    // pageIndex,
    // pageSize,
    // TODO: reintegrate sorting in future release
    // sortDirection,
    // sortField,
  } = props;
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);

  const items = get<MonitorSummary[]>(data, 'monitorStates.summaries', []);
  // TODO: use with pagination
  // const count = get<number>(data, 'monitorStates.totalSummaryCount.count', 0);

  // TODO: reintegrate pagination in future release
  // const pagination: Pagination = {
  //   pageIndex,
  //   pageSize,
  //   pageSizeOptions: [5, 10, 20, 50],
  //   totalItemCount: count,
  //   hidePerPageOptions: false,
  // };

  // TODO: reintegrate sorting in future release
  // const sorting = {
  //   sort: {
  //     field: sortField,
  //     direction: sortDirection,
  //   },
  // };

  return (
    <Fragment>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.monitorList.monitoringStatusTitle"
              defaultMessage="Monitor status"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable
          error={errors ? formatUptimeGraphQLErrorList(errors) : errors}
          loading={loading}
          isExpandable={true}
          hasActions={true}
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
          // TODO: not needed without sorting and pagination
          // onChange={onChange}
          noItemsMessage={
            hasActiveFilters
              ? i18n.translate('xpack.uptime.monitorList.noItemForSelectedFiltersMessage', {
                  defaultMessage: 'No monitors found for selected filter criteria',
                  description:
                    'This message is show if there are no monitors in the table and some filter or search criteria exists',
                })
              : i18n.translate('xpack.uptime.monitorList.noItemMessage', {
                  defaultMessage: 'No uptime monitors found',
                  description:
                    'This message is shown if the monitors table is rendered but has no items.',
                })
          }
          // TODO: reintegrate pagination in future release
          // pagination={pagination}
          // TODO: reintegrate sorting in future release
          // sorting={sorting}
          columns={[
            {
              align: 'left',
              field: 'state.monitor.status',
              name: i18n.translate('xpack.uptime.monitorList.statusColumnLabel', {
                defaultMessage: 'Status',
              }),
              render: (status: string, { state: { timestamp } }: MonitorSummary) => {
                return <MonitorListStatusColumn status={status} timestamp={timestamp} />;
              },
            },
            {
              align: 'left',
              field: 'state.monitor.name',
              name: i18n.translate('xpack.uptime.monitorList.nameColumnLabel', {
                defaultMessage: 'Name',
              }),
              render: (name: string, summary: MonitorSummary) => (
                <MonitorPageLink
                  id={summary.monitor_id}
                  linkParameters={linkParameters}
                  location={undefined}
                >
                  {name ? name : `Unnamed - ${summary.monitor_id}`}
                </MonitorPageLink>
              ),
              sortable: true,
            },
            {
              align: 'left',
              field: 'state.url.full',
              name: i18n.translate('xpack.uptime.monitorList.urlColumnLabel', {
                defaultMessage: 'URL',
              }),
              render: (url: string, summary: MonitorSummary) => (
                <Fragment>
                  <EuiLink href={url} target="_blank" color="text">
                    {url} <EuiIcon size="s" type="popout" color="subbdued" />
                  </EuiLink>
                </Fragment>
              ),
              sortable: true,
            },
            {
              field: 'histogram.points',
              name: i18n.translate('xpack.uptime.monitorList.monitorHistoryColumnLabel', {
                defaultMessage: 'Downtime history',
              }),
              mobileOptions: {
                show: false,
              },
              render: (histogramSeries: SummaryHistogramPoint[] | null) => (
                <MonitorBarSeries
                  absoluteStartDate={absoluteStartDate}
                  absoluteEndDate={absoluteEndDate}
                  dangerColor={dangerColor}
                  histogramSeries={histogramSeries}
                />
              ),
            },
            {
              id: 'actions',
              align: 'right',
              field: 'state',
              hasActions: true,
              mobileOptions: {
                header: false,
              },
              name: i18n.translate(
                'xpack.uptime.monitorList.observabilityIntegrationsColumnLabel',
                {
                  defaultMessage: 'Integrations',
                  description:
                    'The heading column of some action buttons that will take users to other Observability apps',
                }
              ),
              render: (state: any, summary: MonitorSummary) => (
                <MonitorListActionsPopover summary={summary} />
              ),
            },
            {
              align: 'left',
              field: 'monitor_id',
              name: '',
              sortable: true,
              width: '40px',
              isExpander: true,
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
          ]}
        />
      </EuiPanel>
    </Fragment>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorStatesQuery
);
