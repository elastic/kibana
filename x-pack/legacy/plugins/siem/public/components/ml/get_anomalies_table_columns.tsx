/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Columns } from '../load_more_table';
import { AnomaliesByHost, Anomaly } from './types';
import { getRowItemDraggable } from '../tables/helpers';
import { getScoreString } from './get_score_string';
import { EntityDraggable } from './entity_draggable';
import { createCompoundKey } from './create_compound_key';
import { HostDetailsLink } from '../links';

import * as i18n from './translations';

export const getAnomaliesTableColumns = (): [
  Columns<AnomaliesByHost['hostName'], AnomaliesByHost>,
  Columns<Anomaly['severity']>,
  Columns<Anomaly['entityValue'], AnomaliesByHost>,
  Columns<Anomaly['influencers'], AnomaliesByHost>,
  Columns<Anomaly['jobId']>
] => [
  {
    name: i18n.HOST_NAME,
    field: 'hostName',
    sortable: true,
    render: (hostName, anomaliesByHost) =>
      getRowItemDraggable({
        rowItem: hostName,
        attrName: 'host.name',
        idPrefix: `anomalies-table-${createCompoundKey(anomaliesByHost)}-hostName`,
        render: item => <HostDetailsLink hostName={item} />,
      }),
  },
  {
    name: i18n.SCORE,
    field: 'anomaly.severity',
    sortable: true,
    render: severity => getScoreString(severity),
  },
  {
    name: i18n.ENTITY,
    field: 'anomaly.entityValue',
    sortable: true,
    render: (entityValue, anomaliesByHost) => (
      <EntityDraggable
        idPrefix={`anomalies-table-${createCompoundKey(anomaliesByHost)}-entity`}
        entityName={anomaliesByHost.anomaly.entityName}
        entityValue={entityValue}
      />
    ),
  },
  {
    name: i18n.INFLUENCED_BY,
    field: 'anomaly.influencers',
    render: (influencers, anomaliesByHost) => (
      <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
        {influencers.map(influencer => {
          const entityName = Object.keys(influencer)[0];
          const entityValue = Object.values(influencer)[0];
          return (
            <EuiFlexItem
              key={`${entityName}-${entityValue}-${createCompoundKey(anomaliesByHost)}`}
              grow={false}
            >
              <EntityDraggable
                idPrefix={`anomalies-table-${entityName}-${entityValue}-${createCompoundKey(
                  anomaliesByHost
                )}-influencers`}
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
