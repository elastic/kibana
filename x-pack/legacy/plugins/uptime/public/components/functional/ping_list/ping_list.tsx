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
import moment from 'moment';
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Ping, GetPingsParams } from '../../../../common/runtime_types';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';
import { LocationName } from './location_name';
import { Pagination } from './../monitor_list';
import { PingListExpandedRowComponent } from './expanded_row';
import { PingListProps } from '../../connected/pings';

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
  if (itemIdToExpandedRowMap[ping['@timestamp']]) {
    setItemIdToExpandedRowMap({});
    return;
  }

  // Otherwise expand this row
  const newItemIdToExpandedRowMap: ExpandedRowMap = {};
  newItemIdToExpandedRowMap[ping['@timestamp']] = <PingListExpandedRowComponent ping={ping} />;
  setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
};

const SpanWithMargin = styled.span`
  margin-right: 16px;
`;

interface Props extends PingListProps {
  dateRangeStart: string;
  dateRangeEnd: string;
  getPings: (props: GetPingsParams) => void;
  loading: boolean;
  locations: string[];
  pings: Ping[];
  total: number;
}

const DEFAULT_PAGE_SIZE = 10;

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

export const PingListComponent = (props: Props) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const {
    dateRangeStart,
    dateRangeEnd,
    getPings,
    loading,
    locations,
    monitorId,
    pings,
    total,
  } = props;

  useEffect(() => {
    getPings({
      dateRangeStart,
      dateRangeEnd,
      location: selectedLocation,
      monitorId,
      size: pageSize,
      status: status !== 'all' ? status : '',
    });
  }, [dateRangeStart, dateRangeEnd, getPings, monitorId, selectedLocation, pageSize, status]);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<ExpandedRowMap>({});

  const locationOptions = !locations
    ? [AllLocationOption]
    : [AllLocationOption].concat(
        locations.map(name => {
          return { text: name, value: name };
        })
      );

  const hasStatus: boolean = pings.reduce(
    (hasHttpStatus: boolean, currentPing) =>
      hasHttpStatus || !!currentPing.http?.response?.status_code,
    false
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
              values: { fromNow: moment(item['@timestamp']).fromNow() },
              defaultMessage: 'Checked {fromNow}',
              description:
                'A string used to inform our users how long ago Heartbeat pinged the selected host.',
            })}
          </EuiText>
        </div>
      ),
    },
    {
      align: 'left',
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
      align: hasStatus ? 'right' : 'center',
      field: 'error.type',
      name: i18n.translate('xpack.uptime.pingList.errorTypeColumnLabel', {
        defaultMessage: 'Error type',
      }),
      render: (error: string) => error ?? '-',
    },
    // Only add this column is there is any status present in list
    ...(hasStatus
      ? [
          {
            field: 'http.response.status_code',
            align: 'right',
            name: (
              <SpanWithMargin>
                {i18n.translate('xpack.uptime.pingList.responseCodeColumnLabel', {
                  defaultMessage: 'Response code',
                })}
              </SpanWithMargin>
            ),
            render: (statusCode: string) => (
              <SpanWithMargin>
                <EuiBadge>{statusCode}</EuiBadge>
              </SpanWithMargin>
            ),
          },
        ]
      : []),
    {
      align: 'right',
      width: '24px',
      isExpander: true,
      render: (item: Ping) => {
        return (
          <EuiButtonIcon
            onClick={() => toggleDetails(item, itemIdToExpandedRowMap, setItemIdToExpandedRowMap)}
            disabled={!item.error && !(item.http?.response?.body?.content_bytes ?? 0 > 0)}
            aria-label={
              itemIdToExpandedRowMap[item.monitor.id]
                ? i18n.translate('xpack.uptime.pingList.collapseRow', {
                    defaultMessage: 'Collapse',
                  })
                : i18n.translate('xpack.uptime.pingList.expandRow', { defaultMessage: 'Expand' })
            }
            iconType={itemIdToExpandedRowMap[item.monitor.id] ? 'arrowUp' : 'arrowDown'}
          />
        );
      },
    },
  ];

  const pagination: Pagination = {
    initialPageSize: DEFAULT_PAGE_SIZE,
    pageIndex,
    pageSize,
    pageSizeOptions: [10, 25, 50, 100],
    /**
     * we're not currently supporting pagination in this component
     * so the first page is the only page
     */
    totalItemCount: total,
  };

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage id="xpack.uptime.pingList.checkHistoryTitle" defaultMessage="History" />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
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
              value={status}
              onChange={selected => {
                setStatus(selected.target.value);
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
                setSelectedLocation(selected.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable
        loading={loading}
        columns={columns}
        isExpandable={true}
        hasActions={true}
        items={pings}
        itemId="@timestamp"
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        pagination={pagination}
        onChange={(criteria: any) => {
          setPageSize(criteria.page!.size);
          setPageIndex(criteria.page!.index);
        }}
      />
    </EuiPanel>
  );
};
