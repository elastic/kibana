/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as i18n from './translations';
import { StatItems } from '../../../stat_items';

const euiColorVis0 = '#00B3A4';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';
const euiColorVis9 = '#920000';

export const kpiHostDetailsMapping: Readonly<StatItems[]> = [
  {
    key: 'authentication',
    index: 0,
    fields: [
      {
        key: 'authSuccess',
        description: i18n.AUTHENTICATION_SUCCESS,
        value: null,
        color: euiColorVis0,
        icon: 'check',
      },
      {
        key: 'authFailure',
        description: i18n.AUTHENTICATION_FAILURE,
        value: null,
        color: euiColorVis9,
        icon: 'cross',
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 1,
    description: i18n.AUTHENTICATION,
  },
  {
    key: 'uniqueIps',
    index: 1,
    fields: [
      {
        key: 'uniqueSourceIps',
        name: i18n.UNIQUE_SOURCE_IPS_ABBREVIATION,
        description: i18n.UNIQUE_SOURCE_IPS,
        value: null,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'uniqueDestinationIps',
        description: i18n.UNIQUE_DESTINATION_IPS,
        value: null,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 1,
    description: i18n.UNIQUE_IPS,
  },
];
