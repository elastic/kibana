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
  EuiIcon,
  EuiLink,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
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
import { MonitorBarSeries } from '../charts';
import { MonitorPageLink } from './monitor_page_link';
import { MonitorListActionsPopover } from './monitor_list_actions_popover';
import { OverviewPageLink } from './overview_page_link';

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
          aria-label={i18n.translate('xpack.uptime.monitorList.table.description', {
            defaultMessage:
              'Monitor Status table with columns for Status, Name, URL, IP, Downtime History and Integrations. The table is currently displaying {length} items.',
            values: { length: items.length },
          })}
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
                <MonitorPageLink monitorId={summary.monitor_id} linkParameters={linkParameters}>
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
              width: '24px',
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
          ]}
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
