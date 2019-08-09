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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get, last } from 'lodash';
import React, { useState, Fragment } from 'react';
import { withUptimeGraphQL, UptimeGraphQLQueryProps } from '../../higher_order';
import { monitorStatesQuery } from '../../../queries/monitor_states_query';
import {
  MonitorSummary,
  MonitorSummaryResult,
  SummaryHistogramPoint,
  CursorPagination,
  CursorDirection,
  SortOrder,
} from '../../../../common/graphql/types';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { ExpandedRowMap } from './types';
import { MonitorListDrawer } from './monitor_list_drawer';
import { CLIENT_DEFAULTS } from '../../../../common/constants';
import { MonitorBarSeries } from '../charts';
import { MonitorPageLink } from '../monitor_page_link';
import { MonitorListActionsPopover } from './monitor_list_actions_popover';
import { OverviewPageLink } from '../overview_page_link';

interface MonitorListQueryResult {
  monitorStates?: MonitorSummaryResult;
}

interface MonitorListProps {
  absoluteStartDate: number;
  absoluteEndDate: number;
  dangerColor: string;
  successColor: string;
  linkParameters?: string;
  pagination: CursorPagination;
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
    linkParameters,
    loading,
  } = props;
  const [drawerIds, updateDrawerIds] = useState<string[]>([]);

  const items = get<MonitorSummary[]>(data, 'monitorStates.summaries', []);

  const paginationLinkForSummary = (summary: MonitorSummary, cursorDirection: CursorDirection) => {
    const location = get(summary.state, 'observer.geo.name', [])
      .concat()
      .sort()[0];

    const linkPagination = {
      cursorKey: JSON.stringify({
        monitor_id: summary.monitor_id,
        location,
      }),
      cursorDirection,
      sortOrder: SortOrder.ASC,
    };

    if (CursorDirection.BEFORE === cursorDirection) {
      return (
        <OverviewPageLink pagination={linkPagination} linkParameters={linkParameters}>
          <EuiIcon type={'arrowLeft'} />
        </OverviewPageLink>
      );
    }

    return (
      <OverviewPageLink pagination={linkPagination} linkParameters={linkParameters}>
        <EuiIcon type={'arrowRight'} />
      </OverviewPageLink>
    );
  };

  // TODO This should be a new EUI component and get some additional help
  const paginationLinks = (
    <EuiFlexGroup>
      <EuiFlexItem>
        <span>
          {items.length > 0 && paginationLinkForSummary(items[0], CursorDirection.BEFORE)}
          {items.length > 1 && paginationLinkForSummary(last(items), CursorDirection.AFTER)}
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

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
          noItemsMessage={i18n.translate('xpack.uptime.monitorList.noItemMessage', {
            defaultMessage: 'No uptime monitors found',
            description:
              'This message is shown if the monitors table is rendered but has no items.',
          })}
          columns={[
            {
              align: 'left',
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
              field: 'state',
              name: i18n.translate(
                'xpack.uptime.monitorList.observabilityIntegrationsColumnLabel',
                {
                  defaultMessage: 'Integrations',
                  description:
                    'The heading column of some action buttons that will take users to other Obsevability apps',
                }
              ),
              render: (state: any, summary: MonitorSummary) => (
                <MonitorListActionsPopover summary={summary} />
              ),
            },
          ]}
        />
        <EuiFlexItem grow={false}>{paginationLinks}</EuiFlexItem>
      </EuiPanel>
    </Fragment>
  );
};

export const MonitorList = withUptimeGraphQL<MonitorListQueryResult, MonitorListProps>(
  MonitorListComponent,
  monitorStatesQuery
);
