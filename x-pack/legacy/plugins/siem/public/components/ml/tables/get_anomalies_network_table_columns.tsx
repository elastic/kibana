/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Columns } from '../../load_more_table';
import { Anomaly, NarrowDateRange, AnomaliesByNetwork } from '../types';
import { getRowItemDraggable } from '../../tables/helpers';
import { EntityDraggable } from '../entity_draggable';
import { createCompoundNetworkKey } from './create_compound_key';
import { IPDetailsLink } from '../../links';

import * as i18n from './translations';
import { AnomalyScore } from '../score/anomaly_score';

export const getAnomaliesNetworkTableColumns = (
  startDate: number,
  endDate: number,
  interval: string,
  narrowDateRange: NarrowDateRange
): [
  Columns<AnomaliesByNetwork['ip'], AnomaliesByNetwork>,
  Columns<Anomaly['severity'], AnomaliesByNetwork>,
  Columns<Anomaly['entityValue'], AnomaliesByNetwork>,
  Columns<Anomaly['influencers'], AnomaliesByNetwork>,
  Columns<Anomaly['jobId']>
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
    name: i18n.SCORE,
    field: 'anomaly.severity',
    sortable: true,
    render: (_, anomaliesByNetwork) => (
      <AnomalyScore
        startDate={startDate}
        endDate={endDate}
        jobKey={`anomalies-network-table-severity-${createCompoundNetworkKey(anomaliesByNetwork)}`}
        narrowDateRange={narrowDateRange}
        interval={interval}
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
        {influencers.map(influencer => {
          const entityName = Object.keys(influencer)[0];
          const entityValue = Object.values(influencer)[0];
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
    name: i18n.DETECTOR,
    field: 'anomaly.jobId',
    sortable: true,
  },
];
