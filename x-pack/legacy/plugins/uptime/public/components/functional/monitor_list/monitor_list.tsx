/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiPanel,
  EuiTitle,
  EuiButtonIcon,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
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
import { MonitorBarSeries } from '../charts';
import { MonitorPageLink } from './monitor_page_link';
import { OverviewPageLink } from './overview_page_link';
import * as labels from './translations';

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
}

type Props = UptimeGraphQLQueryProps<MonitorListQueryResult> & MonitorListProps;

export const MonitorListComponent = (props: Props) => {
  const {
    absoluteStartDate,
    absoluteEndDate,
    dangerColor,
    data,
    errors,
    hasActiveFilters,
    linkParameters,
    loading,
  } = props;
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);
  const items = get<MonitorSummary[]>(data, 'monitorStates.summaries', []);

  const nextPagePagination = get<string>(data, 'monitorStates.nextPagePagination');
  const prevPagePagination = get<string>(data, 'monitorStates.prevPagePagination');

  const getExpandedRowMap = () => {
    return drawerIds.reduce((map: ExpandedRowMap, id: string) => {
      return {
        ...map,
        [id]: (
          <MonitorListDrawer
            summary={items.find(({ monitor_id: monitorId }) => monitorId === id)}
          />
        ),
      };
    }, {});
  };

  const columns = [
    {
      align: 'left',
      width: '20%',
      field: 'state.monitor.status',
      name: labels.STATUS_COLUMN_LABEL,
      render: (status: string, { state: { timestamp } }: MonitorSummary) => {
        return <MonitorListStatusColumn status={status} timestamp={timestamp} />;
      },
    },
    {
      align: 'left',
      width: '30%',
      field: 'state.monitor.name',
      name: labels.NAME_COLUMN_LABEL,
      render: (name: string, summary: MonitorSummary) => (
        <MonitorPageLink monitorId={summary.monitor_id} linkParameters={linkParameters}>
          {name ? name : `Unnamed - ${summary.monitor_id}`}
        </MonitorPageLink>
      ),
      sortable: true,
    },
    {
      align: 'center',
      field: 'histogram.points',
      name: labels.HISTORY_COLUMN_LABEL,
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
      align: 'right',
      field: 'monitor_id',
      name: '',
      sortable: true,
      isExpander: true,
      render: (id: string) => {
        return (
          <EuiButtonIcon
            aria-label={labels.getExpandDrawerLabel(id)}
            iconType={drawerIds.includes(id) ? 'arrowUp' : 'arrowDown'}
            onClick={() => {
              if (drawerIds.includes(id)) {
                updateDrawerIds(drawerIds.filter(p => p !== id));
              } else {
                updateDrawerIds([...drawerIds, id]);
              }
            }}
          />
        );
      },
    },
  ];

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
          aria-label={labels.getDescriptionLabel(items.length)}
          error={errors ? formatUptimeGraphQLErrorList(errors) : errors}
          // Only set loading to true when there are no items present to prevent the bug outlined in
          // in https://github.com/elastic/eui/issues/2393 . Once that is fixed we can simply set the value here to
          // loading={loading}
          loading={loading && (!items || items.length < 1)}
          isExpandable={true}
          hasActions={true}
          itemId="monitor_id"
          itemIdToExpandedRowMap={getExpandedRowMap()}
          items={items}
          // TODO: not needed without sorting and pagination
          // onChange={onChange}
          noItemsMessage={
            hasActiveFilters ? labels.NO_MONITOR_ITEM_SELECTED : labels.NO_DATA_MESSAGE
          }
          // TODO: reintegrate pagination in future release
          // pagination={pagination}
          // TODO: reintegrate sorting in future release
          // sorting={sorting}
          columns={columns}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <OverviewPageLink
              dataTestSubj="xpack.uptime.monitorList.prevButton"
              direction="prev"
              pagination={prevPagePagination}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <OverviewPageLink
              dataTestSubj="xpack.uptime.monitorList.nextButton"
              direction="next"
              pagination={nextPagePagination}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </Fragment>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorStatesQuery
);
