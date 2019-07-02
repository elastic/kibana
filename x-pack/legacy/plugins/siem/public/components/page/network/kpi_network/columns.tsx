/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as i18n from './translations';
import { getEmptyTagValue } from '../../../empty_value';
import { StatItems, KpiValue } from '../../../stat_items';

const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

export const fieldTitleChartMapping: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'UniqueIps',
    fields: [
      {
        key: 'uniqueSourcePrivateIps',
        name: i18n.SOURCE_NAME,
        description: i18n.SOURCE,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
      {
        key: 'uniqueDestinationPrivateIps',
        name: i18n.DESTINATION_NAME,
        description: i18n.DESTINATION,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.UNIQUE_PRIVATE_IPS,
    enableAreaChart: true,
    enableBarChart: true,
    grow: 2,
  },
];

export const fieldTitleMatrixMapping: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'networkEvents',
    fields: [
      {
        key: 'networkEvents',
        color: euiColorVis1,
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.NETWORK_EVENTS,
    grow: 1,
  },
  {
    key: 'dnsQueries',
    fields: [
      {
        key: 'dnsQueries',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.DNS_QUERIES,
  },
  {
    key: 'uniqueFlowId',
    fields: [
      {
        key: 'uniqueFlowId',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.UNIQUE_FLOW_IDS,
  },
  {
    key: 'tlsHandshakes',
    fields: [
      {
        key: 'tlsHandshakes',
        render: value => {
          return value != null ? value.toLocaleString() : getEmptyTagValue();
        },
      },
    ],
    description: i18n.TLS_HANDSHAKES,
  },
];
