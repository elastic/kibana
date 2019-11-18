/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFormRow,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React, { Fragment, useEffect, useState } from 'react';
// @ts-ignore formatNumber
import { formatNumber } from '@elastic/eui/lib/services/format';
import { Ping, PingResults } from '../../../../common/graphql/types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { pingsQuery } from '../../../queries';
import { LocationName } from './../location_name';
import { Criteria, Pagination } from './../monitor_list';
import { PingListExpandedRowComponent } from './expanded_row';

interface PingListQueryResult {
  allPings?: PingResults;
}

interface PingListProps {
  onSelectedStatusChange: (status: string | undefined) => void;
  onSelectedLocationChange: (location: any) => void;
  onPageCountChange: (itemCount: number) => void;
  onUpdateApp: () => void;
  pageSize: number;
  selectedOption: string;
  selectedLocation: string | undefined;
}

type Props = UptimeGraphQLQueryProps<PingListQueryResult> & PingListProps;
interface ExpandedRowMap {
  [key: string]: JSX.Element;
}

export const AllLocationOption = { text: 'All', value: '' };

export const toggleDetails = (
  ping: Ping,
  itemIdToExpandedRowMap: ExpandedRowMap,
  setItemIdToExpandedRowMap: (update: ExpandedRowMap) => any
) => {
  // If the user has clicked on the expanded map, close all expanded rows.
  if (itemIdToExpandedRowMap[ping.id]) {
    setItemIdToExpandedRowMap({});
    return;
  }

  // Otherwise expand this row
  const newItemIdToExpandedRowMap: ExpandedRowMap = {};
  newItemIdToExpandedRowMap[ping.id] = <PingListExpandedRowComponent ping={ping} />;
  setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
};

export const PingListComponent = ({
  data,
  loading,
  onPageCountChange,
  onSelectedLocationChange,
  onSelectedStatusChange,
  onUpdateApp,
  pageSize,
  selectedOption,
  selectedLocation,
}: Props) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<ExpandedRowMap>({});

  useEffect(() => {
    onUpdateApp();
  }, [onUpdateApp, selectedOption]);

  const statusOptions = [
    {
      text: i18n.translate('xpack.uptime.pingList.statusOptions.allStatusOptionLabel', {
        defaultMessage: 'All',
      }),
      value: '',
    },
    {
      text: i18n.translate('xpack.uptime.pingList.statusOptions.upStatusOptionLabel', {
        defaultMessage: 'Up',
      }),
      value: 'up',
    },
    {
      text: i18n.translate('xpack.uptime.pingList.statusOptions.downStatusOptionLabel', {
        defaultMessage: 'Down',
      }),
      value: 'down',
    },
  ];
  const locations = get<string[]>(data, 'allPings.locations');
  const locationOptions = !locations
    ? [AllLocationOption]
    : [AllLocationOption].concat(
        locations.map(name => {
          return { text: name, value: name };
        })
      );

  const columns: any[] = [
    {
      field: 'monitor.status',
      name: i18n.translate('xpack.uptime.pingList.statusColumnLabel', {
        defaultMessage: 'Status',
      }),
      render: (pingStatus: string, item: Ping) => (
        <div>
          <EuiHealth color={pingStatus === 'up' ? 'success' : 'danger'}>
            {pingStatus === 'up'
              ? i18n.translate('xpack.uptime.pingList.statusColumnHealthUpLabel', {
                  defaultMessage: 'Up',
                })
              : i18n.translate('xpack.uptime.pingList.statusColumnHealthDownLabel', {
                  defaultMessage: 'Down',
                })}
          </EuiHealth>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.uptime.pingList.recencyMessage', {
              values: { fromNow: moment(item.timestamp).fromNow() },
              defaultMessage: 'Checked {fromNow}',
              description:
                'A string used to inform our users how long ago Heartbeat pinged the selected host.',
            })}
          </EuiText>
        </div>
      ),
    },
    {
      align: 'center',
      field: 'observer.geo.name',
      name: i18n.translate('xpack.uptime.pingList.locationNameColumnLabel', {
        defaultMessage: 'Location',
      }),
      render: (location: string) => <LocationName location={location} />,
    },
    {
      align: 'right',
      dataType: 'number',
      field: 'monitor.ip',
      name: i18n.translate('xpack.uptime.pingList.ipAddressColumnLabel', {
        defaultMessage: 'IP',
      }),
    },
    {
      align: 'right',
      field: 'monitor.duration.us',
      name: i18n.translate('xpack.uptime.pingList.durationMsColumnLabel', {
        defaultMessage: 'Duration',
      }),
      render: (duration: number) =>
        i18n.translate('xpack.uptime.pingList.durationMsColumnFormatting', {
          values: { millis: microsToMillis(duration) },
          defaultMessage: '{millis} ms',
        }),
    },
    {
      align: 'right',
      field: 'error.type',
      name: i18n.translate('xpack.uptime.pingList.errorTypeColumnLabel', {
        defaultMessage: 'Error type',
      }),
      render: (error: string) => error ?? '-',
    },
  ];
  useEffect(() => {
    onUpdateApp();
  }, [onUpdateApp, selectedOption]);
  let pings: Ping[] = [];
  if (data && data.allPings && data.allPings.pings) {
    pings = data.allPings.pings;
    const hasStatus: boolean = pings.reduce(
      (hasHttpStatus: boolean, currentPing: Ping) =>
        hasHttpStatus || !!get(currentPing, 'http.response.status_code'),
      false
    );
    if (hasStatus) {
      columns.push({
        field: 'http.response.status_code',
        // @ts-ignore "align" property missing on type definition for column type
        align: 'right',
        name: i18n.translate('xpack.uptime.pingList.responseCodeColumnLabel', {
          defaultMessage: 'Response code',
        }),
        render: (statusCode: string) => <EuiBadge>{statusCode}</EuiBadge>,
      });
    }
  }

  columns.push({
    align: 'right',
    width: '24px',
    isExpander: true,
    render: (item: Ping) => (
      <EuiButtonIcon
        onClick={() => toggleDetails(item, itemIdToExpandedRowMap, setItemIdToExpandedRowMap)}
        aria-label={
          itemIdToExpandedRowMap[item.id]
            ? i18n.translate('xpack.uptime.pingList.collapseRow', { defaultMessage: 'Collapse' })
            : i18n.translate('xpack.uptime.pingList.expandRow', { defaultMessage: 'Expand' })
        }
        iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
      />
    ),
  });
  const pagination: Pagination = {
    initialPageSize: 20,
    pageIndex: 0,
    pageSize,
    pageSizeOptions: [5, 10, 20, 50, 100],
    /**
     * we're not currently supporting pagination in this component
     * so the first page is the only page
     */
    totalItemCount: pageSize,
  };

  return (
    <Fragment>
      <EuiPanel>
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.uptime.pingList.checkHistoryTitle"
              defaultMessage="History"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem style={{ minWidth: 200 }}>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow
                      label="Status"
                      aria-label={i18n.translate('xpack.uptime.pingList.statusLabel', {
                        defaultMessage: 'Status',
                      })}
                    >
                      <EuiSelect
                        options={statusOptions}
                        aria-label={i18n.translate('xpack.uptime.pingList.statusLabel', {
                          defaultMessage: 'Status',
                        })}
                        value={selectedOption}
                        onChange={selected => {
                          if (typeof selected.target.value === 'string') {
                            onSelectedStatusChange(
                              selected.target && selected.target.value !== ''
                                ? selected.target.value
                                : undefined
                            );
                          }
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      label="Location"
                      aria-label={i18n.translate('xpack.uptime.pingList.locationLabel', {
                        defaultMessage: 'Location',
                      })}
                    >
                      <EuiSelect
                        options={locationOptions}
                        value={selectedLocation}
                        aria-label={i18n.translate('xpack.uptime.pingList.locationLabel', {
                          defaultMessage: 'Location',
                        })}
                        onChange={selected => {
                          onSelectedLocationChange(
                            selected.target && selected.target.value !== ''
                              ? selected.target.value
                              : null
                          );
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          loading={loading}
          columns={columns}
          isExpandable={true}
          hasActions={true}
          items={pings}
          itemId="id"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          pagination={pagination}
          onChange={(criteria: Criteria) => onPageCountChange(criteria.page!.size)}
        />
      </EuiPanel>
    </Fragment>
  );
};

export const PingList = withUptimeGraphQL<PingListQueryResult, PingListProps>(
  PingListComponent,
  pingsQuery
);
