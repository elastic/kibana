/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as i18n from './translations';
import { PreferenceFormattedBytes } from '../../../formatted_bytes';
import { getEmptyTagValue } from '../../../empty_value';
import { StatItems, KpiValue } from '../../../stat_items';

const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';

export const fieldTitleChartMapping: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'bytes',
    fields: [
      {
        key: 'sourceByte',
        name: i18n.OUT,
        description: i18n.OUT,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: bytes => {
          if (bytes != null) {
            return <PreferenceFormattedBytes value={bytes} />;
          } else {
            return getEmptyTagValue();
          }
        },
      },
      {
        key: 'destinationByte',
        name: i18n.IN,
        description: i18n.IN,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
        render: bytes => {
          if (bytes != null) {
            return <PreferenceFormattedBytes value={bytes} />;
          } else {
            return getEmptyTagValue();
          }
        },
      },
    ],
    description: i18n.BYTES,
    enableAreaChart: false,
    enableBarChart: true,
    grow: 2,
  },
  {
    key: 'topTransportIp',
    fields: [
      {
        key: 'topSourceIp',
        barchartKey: 'topSourceIpTransportBytes',
        name: i18n.SOURCE,
        description: i18n.SOURCE,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: value => {
          if (value != null) {
            return value;
          } else {
            return getEmptyTagValue();
          }
        },
      },
      {
        key: 'topDestinationIp',
        barchartKey: 'topDestinationIpTransportBytes',
        name: i18n.DESTINATION,
        description: i18n.DESTINATION,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
        render: value => {
          if (value != null) {
            return value;
          } else {
            return getEmptyTagValue();
          }
        },
      },
    ],
    description: i18n.TOP_TRANSPORT_IP,
    enableAreaChart: false,
    enableBarChart: true,
    grow: 2,
  },
];

export const fieldTitleMatrixMapping: Readonly<Array<StatItems<KpiValue>>> = [
  {
    key: 'topPort',
    fields: [
      {
        key: 'topDestinationPort',
        name: i18n.TOP_DESTINATION_PORT,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: value => {
          if (value != null) {
            return value;
          } else {
            return getEmptyTagValue();
          }
        },
      },
    ],
    description: i18n.TOP_DESTINATION_PORT,
    enableAreaChart: false,
    enableBarChart: false,
    grow: 1,
  },
  {
    key: 'topTransport',
    fields: [
      {
        key: 'topTransport',
        name: i18n.TOP_TRANSPORT,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
        render: value => {
          if (value != null) {
            return value;
          } else {
            return getEmptyTagValue();
          }
        },
      },
    ],
    description: i18n.TOP_TRANSPORT,
    enableAreaChart: false,
    enableBarChart: false,
    grow: 1,
  },
];
