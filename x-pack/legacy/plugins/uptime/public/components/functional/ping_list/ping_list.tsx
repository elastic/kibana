/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBadge,
  EuiBasicTable,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
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
  onSelectedStatusChange: (status: string | null) => void;
  onSelectedLocationChange: (location: EuiComboBoxOptionProps[]) => void;
  onPageCountChange: (itemCount: number) => void;
  onUpdateApp: () => void;
  pageSize: number;
  selectedOption: string;
  selectedLocation: EuiComboBoxOptionProps[];
}

type Props = UptimeGraphQLQueryProps<PingListQueryResult> & PingListProps;
interface ExpandedRowMap {
  [key: string]: JSX.Element;
}

export const BaseLocationOptions = [{ label: 'All', value: 'All' }];

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
  }, [selectedOption]);

  const statusOptions: EuiComboBoxOptionProps[] = [
    {
      label: i18n.translate('xpack.uptime.pingList.statusOptions.allStatusOptionLabel', {
        defaultMessage: 'All',
      }),
      value: '',
    },
    {
      label: i18n.translate('xpack.uptime.pingList.statusOptions.upStatusOptionLabel', {
        defaultMessage: 'Up',
      }),
      value: 'up',
    },
    {
      label: i18n.translate('xpack.uptime.pingList.statusOptions.downStatusOptionLabel', {
        defaultMessage: 'Down',
      }),
      value: 'down',
    },
  ];
  const locations = get<string[]>(data, 'allPings.locations');
  const locationOptions: EuiComboBoxOptionProps[] = !locations
    ? BaseLocationOptions
    : BaseLocationOptions.concat(
        locations.map(name => {
          return { label: name, value: name };
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

  const pings: Ping[] = data?.allPings?.pings ?? [];

  const hasStatus: boolean = pings.some(
    (currentPing: Ping) => !!currentPing?.http?.response?.status_code
  );
  if (hasStatus) {
    columns.push({
      field: 'http.response.status_code',
      align: 'center',
      name: i18n.translate('xpack.uptime.pingList.responseCodeColumnLabel', {
        defaultMessage: 'Response code',
      }),
      render: (statusCode: string) => <EuiBadge>{statusCode}</EuiBadge>,
    });
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
                      <EuiComboBox
                        isClearable={false}
                        singleSelection={{ asPlainText: true }}
                        selectedOptions={[
                          statusOptions.find(({ value }) => value === selectedOption) ||
                            statusOptions[2],
                        ]}
                        options={statusOptions}
                        aria-label={i18n.translate('xpack.uptime.pingList.statusLabel', {
                          defaultMessage: 'Status',
                        })}
                        onChange={(selectedOptions: EuiComboBoxOptionProps[]) => {
                          if (typeof selectedOptions[0].value === 'string') {
                            onSelectedStatusChange(
                              // @ts-ignore it's definitely a string
                              selectedOptions[0].value !== '' ? selectedOptions[0].value : null
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
                      <EuiComboBox
                        isClearable={false}
                        singleSelection={{ asPlainText: true }}
                        selectedOptions={selectedLocation}
                        options={locationOptions}
                        aria-label={i18n.translate('xpack.uptime.pingList.locationLabel', {
                          defaultMessage: 'Location',
                        })}
                        onChange={(selectedOptions: EuiComboBoxOptionProps[]) => {
                          onSelectedLocationChange(selectedOptions);
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
          onChange={({ page: { size } }: Criteria) => onPageCountChange(size)}
        />
      </EuiPanel>
    </Fragment>
  );
};

export const PingList = withUptimeGraphQL<PingListQueryResult, PingListProps>(
  PingListComponent,
  pingsQuery
);
