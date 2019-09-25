/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import moment from 'moment';
import { Columns } from '../../load_more_table';
import { Anomaly, NarrowDateRange, AnomaliesByNetwork } from '../types';
import { getRowItemDraggable } from '../../tables/helpers';
import { EntityDraggable } from '../entity_draggable';
import { createCompoundNetworkKey } from './create_compound_key';
import { IPDetailsLink } from '../../links';

import * as i18n from './translations';
import { getEntries } from '../get_entries';
import { DraggableScore } from '../score/draggable_score';
import { createExplorerLink } from '../links/create_explorer_link';
import { LocalizedDateTooltip } from '../../localized_date_tooltip';
import { PreferenceFormattedDate } from '../../formatted_date';
import { NetworkType } from '../../../store/network/model';
import { escapeDataProviderId } from '../../drag_and_drop/helpers';

export const getAnomaliesNetworkTableColumns = (
  startDate: number,
  endDate: number,
  interval: string,
  narrowDateRange: NarrowDateRange
): [
  Columns<AnomaliesByNetwork['ip'], AnomaliesByNetwork>,
  Columns<Anomaly['severity'], AnomaliesByNetwork>,
  Columns<Anomaly['jobId'], AnomaliesByNetwork>,
  Columns<Anomaly['entityValue'], AnomaliesByNetwork>,
  Columns<Anomaly['influencers'], AnomaliesByNetwork>,
  Columns<Anomaly['time'], AnomaliesByNetwork>
] => [
  {
    name: i18n.NETWORK_NAME,
    field: 'ip',
    sortable: true,
    render: (ip, anomaliesByNetwork) =>
      getRowItemDraggable({
        rowItem: ip,
        attrName: anomaliesByNetwork.type,
        idPrefix: `anomalies-network-table-ip-${createCompoundNetworkKey(anomaliesByNetwork)}`,
        render: item => <IPDetailsLink ip={item} />,
      }),
  },
  {
    name: i18n.DETECTOR,
    field: 'anomaly.jobId',
    sortable: true,
    render: (jobId, anomaliesByHost) => (
      <EuiLink
        href={`${createExplorerLink(anomaliesByHost.anomaly, startDate, endDate)}`}
        target="_blank"
      >
        {jobId}
      </EuiLink>
    ),
  },
  {
    name: i18n.SCORE,
    field: 'anomaly.severity',
    sortable: true,
    render: (_, anomaliesByNetwork) => (
      <DraggableScore
        id={escapeDataProviderId(
          `anomalies-network-table-severity-${createCompoundNetworkKey(anomaliesByNetwork)}`
        )}
        score={anomaliesByNetwork.anomaly}
      />
    ),
  },
  {
    name: i18n.ENTITY,
    field: 'anomaly.entityValue',
    sortable: true,
    render: (entityValue, anomaliesByNetwork) => (
      <EntityDraggable
        idPrefix={`anomalies-network-table-entityValue-${createCompoundNetworkKey(
          anomaliesByNetwork
        )}`}
        entityName={anomaliesByNetwork.anomaly.entityName}
        entityValue={entityValue}
      />
    ),
  },
  {
    name: i18n.INFLUENCED_BY,
    field: 'anomaly.influencers',
    render: (influencers, anomaliesByNetwork) => (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {influencers &&
          influencers.map(influencer => {
            const [key, value] = getEntries(influencer);
            const entityName = key != null ? key : '';
            const entityValue = value != null ? value : '';
            return (
              <EuiFlexItem
                key={`${entityName}-${entityValue}-${createCompoundNetworkKey(anomaliesByNetwork)}`}
                grow={false}
              >
                <EntityDraggable
                  idPrefix={`anomalies-network-table-influencers-${entityName}-${entityValue}-${createCompoundNetworkKey(
                    anomaliesByNetwork
                  )}`}
                  entityName={entityName}
                  entityValue={entityValue}
                />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
    ),
  },
  {
    name: i18n.TIME_STAMP,
    field: 'anomaly.time',
    sortable: true,
    render: time => (
      <LocalizedDateTooltip date={moment(new Date(time)).toDate()}>
        <PreferenceFormattedDate value={new Date(time)} />
      </LocalizedDateTooltip>
    ),
  },
];

export const getAnomaliesNetworkTableColumnsCurated = (
  pageType: NetworkType,
  startDate: number,
  endDate: number,
  interval: string,
  narrowDateRange: NarrowDateRange
) => {
  const columns = getAnomaliesNetworkTableColumns(startDate, endDate, interval, narrowDateRange);

  // Columns to exclude from ip details pages
  if (pageType === NetworkType.details) {
    return columns.filter(column => column.name !== i18n.NETWORK_NAME);
  } else {
    return columns;
  }
};
