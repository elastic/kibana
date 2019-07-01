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
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { get } from 'lodash';
import moment from 'moment';
import { LatestMonitor, Ping, MonitorSeriesPoint } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorListQuery } from '../../queries';
import { MonitorListActionsPopover } from './monitor_list_actions_popover';
import { MonitorPageLink } from './monitor_page_link';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { MonitorBarSeries } from './charts';
import { LocationName } from './location_name';

interface MonitorListQueryResult {
  // TODO: clean up this ugly result data shape, there should be no nesting
  monitorStatus?: {
    monitors: LatestMonitor[];
  };
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
}

type Props = UptimeGraphQLQueryProps<MonitorListQueryResult> & MonitorListProps;

const MONITOR_LIST_DEFAULT_PAGINATION = 10;

const monitorListPagination = {
  initialPageSize: MONITOR_LIST_DEFAULT_PAGINATION,
  pageSizeOptions: [5, 10, 20, 50],
};

export const MonitorListComponent = ({
  absoluteStartDate,
  absoluteEndDate,
  basePath,
  dangerColor,
  dateRangeStart,
  dateRangeEnd,
  data,
  linkParameters,
  loading,
}: Props) => {
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
        <EuiSpacer size="s" />
        <EuiInMemoryTable
          columns={[
            {
              field: 'ping.monitor.status',
              width: '150px',
              name: i18n.translate('xpack.uptime.monitorList.statusColumnLabel', {
                defaultMessage: 'Status',
              }),
              render: (status: string, monitor: LatestMonitor) => {
                const timestamp = moment(get<string>(monitor, 'ping.timestamp'));
                return (
                  <MonitorListStatusColumn
                    absoluteTime={timestamp.toLocaleString()}
                    relativeTime={timestamp.fromNow()}
                    status={status}
                  />
                );
              },
            },
            {
              field: 'ping.monitor.id',
              name: i18n.translate('xpack.uptime.monitorList.idColumnLabel', {
                defaultMessage: 'ID',
              }),
              render: (id: string, monitor: LatestMonitor) => (
                <MonitorPageLink id={id} location={undefined} linkParameters={linkParameters}>
                  {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.name
                    ? monitor.ping.monitor.name
                    : id}
                </MonitorPageLink>
              ),
            },
            {
              field: 'ping.observer.geo.name',
              name: i18n.translate('xpack.uptime.monitorList.geoName', {
                defaultMessage: 'Location',
                description: 'Users can specify a name for a location',
              }),
              render: (location: string) => <LocationName location={location} />,
            },
            {
              field: 'ping.url.full',
              name: i18n.translate('xpack.uptime.monitorList.urlColumnLabel', {
                defaultMessage: 'URL',
              }),
              render: (url: string, monitor: LatestMonitor) => (
                <div>
                  <EuiLink href={url} target="_blank" color="text">
                    {url} <EuiIcon size="s" type="popout" color="subdued" />
                  </EuiLink>
                  {monitor.ping && monitor.ping.monitor && monitor.ping.monitor.ip ? (
                    <EuiText size="xs" color="subdued">
                      {monitor.ping.monitor.ip}
                    </EuiText>
                  ) : null}
                </div>
              ),
            },
            {
              field: 'downSeries',
              width: '180px',
              align: 'right',
              name: i18n.translate('xpack.uptime.monitorList.monitorHistoryColumnLabel', {
                defaultMessage: 'Downtime history',
              }),
              render: (downSeries: MonitorSeriesPoint[] | undefined | null) => {
                if (!downSeries) {
                  return null;
                }
                return (
                  <MonitorBarSeries
                    absoluteStartDate={absoluteStartDate}
                    absoluteEndDate={absoluteEndDate}
                    dangerColor={dangerColor}
                    downSeries={downSeries}
                  />
                );
              },
            },
            {
              align: 'right',
              field: 'ping',
              width: '110px',
              name: i18n.translate(
                'xpack.uptime.monitorList.observabilityIntegrationsColumnLabel',
                {
                  defaultMessage: 'Integrations',
                  description:
                    'The heading column of some action buttons that will take users to other Obsevability apps',
                }
              ),
              render: (ping: Ping, monitor: LatestMonitor) => (
                <MonitorListActionsPopover monitor={monitor} />
              ),
            },
          ]}
          loading={loading}
          items={(data && data.monitorStatus && data.monitorStatus.monitors) || []}
          pagination={monitorListPagination}
        />
      </EuiPanel>
    </Fragment>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorListQuery
);
