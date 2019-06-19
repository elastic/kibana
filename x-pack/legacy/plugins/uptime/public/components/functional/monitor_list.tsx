/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiFlexItem,
  EuiText,
  EuiFlexGrid,
  EuiBadge,
  EuiToolTip,
  EuiHealth,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment, useState } from 'react';
import { get } from 'lodash';
import moment from 'moment';
import { LatestMonitor, Ping, MonitorSeriesPoint } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorStatesQuery } from '../../queries/monitor_states_query';
import { MonitorListActionsPopover } from './monitor_list_actions_popover';
import { MonitorPageLink } from './monitor_page_link';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { toCondensedCheck } from './condensed_check/to_condensed_check';
import { MonitorBarSeries } from './charts';
import { MonitorSummary, MonitorSummaryResult } from '../../../common/graphql/types';

interface MonitorListQueryResult {
  monitorStates?: MonitorSummaryResult;
}

export interface CondensedCheck {
  childStatuses: CondensedCheckStatus[];
  location: string | null;
  status: string;
  timestamp: string;
}

export interface CondensedCheckStatus {
  ip?: string | null;
  status: string;
}

interface MonitorListProps {
  /**
   * The date/time for the start of the timespan.
   */
  absoluteStartDate: number;
  /**
   * The date/time for the end of the timespan.
   */
  absoluteEndDate: number;
  /**
   * The base path Kibana is using.
   */
  basePath: string;
  /**
   * This color will be used to express "down"-related visualizations.
   */
  dangerColor: string;
  /**
   * The string-value currently in use by the date picker's start time.
   */
  dateRangeStart: string;
  /**
   * The string-value currently in use by the date picker's end time.
   */
  dateRangeEnd: string;
  /**
   * The current URL params. These will be passed by links rendered by this component.
   */
  linkParameters?: string;
  successColor: string;
  pageIndex: number;
  pageSize: number;
  onChange: (criteria: Criteria) => void;
  sortField: string;
  sortDirection: string;
}

type Props = UptimeGraphQLQueryProps<MonitorListQueryResult> & MonitorListProps;

const drawer = (summary: MonitorSummary | undefined, dangerColor: string, successColor: string) => {
  if (
    !summary ||
    (!summary.state || !summary.state.checks) ||
    !Array.isArray(summary.state.checks)
  ) {
    return null;
  }
  // TODO: extract this value to a constants file
  if (summary.state.checks.length < 12) {
    // TODO: extract to dedicated component
    return (
      <EuiFlexGrid columns={3} style={{ paddingLeft: '40px' }}>
        {summary.state.checks.map(check => {
          const momentTimestamp = moment(parseInt(check.timestamp, 10));
          return (
            <React.Fragment key={check.observer.geo.name + check.agent.id + check.monitor.ip}>
              <EuiFlexItem>
                <MonitorListStatusColumn
                  absoluteTime={momentTimestamp.toLocaleString()}
                  relativeTime={momentTimestamp.fromNow()}
                  status={check.monitor.status}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">{check.observer.geo.name}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText color="secondary" size="s">
                  {check.monitor.ip}
                </EuiText>
              </EuiFlexItem>
            </React.Fragment>
          );
        })}
      </EuiFlexGrid>
    );
  } else {
    // reduce and render condensed component
    // const condensedChecks: CondensedCheck[] = summary.state.checks.reduce(() => {}, []);
    return (
      <CondensedCheckList
        condensedChecks={toCondensedCheck(summary.state.checks)}
        dangerColor={dangerColor}
        successColor={successColor}
      />
    );
  }
};

const getBadgeColor = (status: string, successColor: string, dangerColor: string) => {
  switch (status) {
    case 'up':
      return successColor;
    case 'down':
      return dangerColor;
    case 'mixed':
      return 'secondary';
    default:
      return undefined;
  }
};

interface CondensedCheckListProps {
  condensedChecks: CondensedCheck[];
  successColor: string;
  dangerColor: string;
}

const CondensedCheckList = ({
  condensedChecks,
  dangerColor,
  successColor,
}: CondensedCheckListProps) => (
  <EuiFlexGrid columns={3} style={{ paddingLeft: '40px' }}>
    {condensedChecks.map(({ childStatuses, location, status, timestamp }: CondensedCheck) => (
      <React.Fragment key={location || 'null'}>
        <EuiFlexItem>
          <MonitorListStatusColumn
            absoluteTime={moment(parseInt(timestamp, 10)).toLocaleString()}
            relativeTime={moment(parseInt(timestamp, 10)).from()}
            status={status}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {/* TODO: this is incomplete */}
          <EuiText size="s">{location || 'TODO HANDLE MISSING LOCATION'}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="right"
            title="Check statuses"
            content={childStatuses.map(({ status: checkStatus, ip }: CondensedCheckStatus) => (
              <div key={ip || 'null'}>
                <EuiHealth
                  color={
                    checkStatus === 'up'
                      ? successColor
                      : checkStatus === 'down'
                      ? dangerColor
                      : '#FF00FF'
                  }
                />
                {ip || 'DNS issue'}
              </div>
            ))}
          >
            <EuiBadge color={getBadgeColor(status, successColor, dangerColor)}>{`${
              childStatuses.length
            } checks`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      </React.Fragment>
    ))}
  </EuiFlexGrid>
);

interface Pagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
  hidePerPageOptions: boolean;
}

export interface Criteria {
  page: {
    index: number;
    size: number;
  };
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export const MonitorListComponent = (props: Props) => {
  const {
    absoluteStartDate,
    absoluteEndDate,
    basePath,
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
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: JSX.Element | null }>({});
  if (!data || !data.monitorStates) return null;

  const {
    summaries: items,
    totalSummaryCount: { count },
  } = data.monitorStates;

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
    <Fragment>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.uptime.monitorList.monitoringStatusTitle"
            defaultMessage="Monitor status"
          />
        </h5>
      </EuiTitle>
      <EuiPanel paddingSize="s">
        <EuiBasicTable
          error={errors ? formatUptimeGraphQLErrorList(errors) : errors}
          loading={loading}
          isExpandable
          itemId="monitor_id"
          itemIdToExpandedRowMap={expandedItems}
          items={items || []}
          onChange={onChange}
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
                    aria-label="TODODONOTMERGEWITHOUTSETTINGTHIS"
                    iconType={expandedItems[id] ? 'arrowUp' : 'arrowDown'}
                    onClick={() =>
                      expandedItems[id]
                        ? setExpandedItems({})
                        : setExpandedItems({
                            [id]: drawer(
                              items.find(({ monitor_id: monitorId }) => monitorId === id),
                              dangerColor,
                              successColor
                            ),
                          })
                    }
                  />
                );
              },
            },
            {
              field: 'state.monitor.status',
              name: 'Status',
              render: (status: string, { state: { timestamp, summary } }: MonitorSummary) => {
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
          // outdated columns
          // {
          //   field: 'ping.monitor.status',
          //   width: '150px',
          //   name: i18n.translate('xpack.uptime.monitorList.statusColumnLabel', {
          //     defaultMessage: 'Status',
          //   }),
          //   render: (status: string, monitor: LatestMonitor) => {
          //     const timestamp = moment(get<string>(monitor, 'ping.timestamp'));
          //     return (
          //       <MonitorListStatusColumn
          //         absoluteTime={timestamp.toLocaleString()}
          //         relativeTime={timestamp.fromNow()}
          //         status={status}
          //       />
          //     );
          //   },
          // },
          // {
          //   field: 'ping.monitor.id',
          //   name: i18n.translate('xpack.uptime.monitorList.idColumnLabel', {
          //     defaultMessage: 'ID',
          //   }),
          //   render: (id: string, monitor: LatestMonitor) => (
          //     <MonitorPageLink
          //       id={id}
          //       location={get<string | undefined>(monitor, 'ping.observer.geo.name')}
          //       linkParameters={linkParameters}
          //     >
          //       {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.name
          //         ? monitor.ping.monitor.name
          //         : id}
          //     </MonitorPageLink>
          //   ),
          // },
          // {
          //   field: 'ping.observer.geo.name',
          //   name: i18n.translate('xpack.uptime.monitorList.geoName', {
          //     defaultMessage: 'Location',
          //     description: 'Users can specify a name for a location',
          //   }),
          //   render: (locationName: string | null | undefined) =>
          //     !!locationName ? (
          //       locationName
          //     ) : (
          //       <EuiLink
          //         href="https://www.elastic.co/guide/en/beats/heartbeat/current/configuration-observer-options.html"
          //         target="_blank"
          //       >
          //         {i18n.translate('xpack.uptime.monitorList.geoName.helpLinkAnnotation', {
          //           defaultMessage: 'Add location',
          //           description:
          //             'Text that instructs the user to navigate to our docs to add a geographic location to their data',
          //         })}
          //         &nbsp;
          //         <EuiIcon size="s" type="popout" />
          //       </EuiLink>
          //     ),
          // },
          // {
          //   field: 'ping.url.full',
          //   name: i18n.translate('xpack.uptime.monitorList.urlColumnLabel', {
          //     defaultMessage: 'URL',
          //   }),
          //   render: (url: string, monitor: LatestMonitor) => (
          //     <div>
          //       <EuiLink href={url} target="_blank" color="text">
          //         {url} <EuiIcon size="s" type="popout" color="subdued" />
          //       </EuiLink>
          //       {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.ip ? (
          //         <EuiText size="xs" color="subdued">
          //           {monitor.ping.monitor.ip}
          //         </EuiText>
          //       ) : null}
          //     </div>
          //   ),
          // },
          // {
          //   field: 'downSeries',
          //   width: '180px',
          //   align: 'right',
          //   name: i18n.translate('xpack.uptime.monitorList.monitorHistoryColumnLabel', {
          //     defaultMessage: 'Downtime history',
          //   }),
          //   render: (downSeries: MonitorSeriesPoint[] | undefined | null) => {
          //     if (!downSeries) {
          //       return null;
          //     }
          //     return (
          //       <MonitorBarSeries
          //         absoluteStartDate={absoluteStartDate}
          //         absoluteEndDate={absoluteEndDate}
          //         dangerColor={dangerColor}
          //         downSeries={downSeries}
          //       />
          //     );
          //   },
          // },
          // {
          //   align: 'right',
          //   field: 'ping',
          //   width: '110px',
          //   name: i18n.translate(
          //     'xpack.uptime.monitorList.observabilityIntegrationsColumnLabel',
          //     {
          //       defaultMessage: 'Integrations',
          //       description:
          //         'The heading column of some action buttons that will take users to other Obsevability apps',
          //     }
          //   ),
          //   render: (ping: Ping, monitor: LatestMonitor) => (
          //     <MonitorListActionsPopover monitor={monitor} />
          //   ),
          // },
        />
      </EuiPanel>
    </Fragment>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorStatesQuery
);
