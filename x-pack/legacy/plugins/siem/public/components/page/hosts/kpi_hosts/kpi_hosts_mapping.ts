/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as i18n from './translations';
import { StatItems } from '../../../stat_items';

const euiColorVis0 = '#00B3A4';
const euiColorVis1 = '#3185FC';
const euiColorVis2 = '#DB1374';
const euiColorVis3 = '#490092';
const euiColorVis9 = '#920000';

export const kpiHostsMapping: Readonly<StatItems[]> = [
  {
    key: 'hosts',
    index: 0,
    fields: [
      {
        key: 'hosts',
        value: null,
        color: euiColorVis1,
        icon: 'storage',
      },
    ],
    enableAreaChart: true,
    grow: 2,
    description: i18n.HOSTS,
  },
  {
    key: 'authentication',
    index: 1,
    fields: [
      {
        key: 'authSuccess',
        name: i18n.SUCCESS_CHART_LABEL,
        description: i18n.SUCCESS_UNIT_LABEL,
        value: null,
        color: euiColorVis0,
        icon: 'check',
      },
      {
        key: 'authFailure',
        name: i18n.FAIL_CHART_LABEL,
        description: i18n.FAIL_UNIT_LABEL,
        value: null,
        color: euiColorVis9,
        icon: 'cross',
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 4,
    description: i18n.USER_AUTHENTICATIONS,
  },
  {
    key: 'uniqueIps',
    index: 2,
    fields: [
      {
        key: 'uniqueSourceIps',
        name: i18n.SOURCE_CHART_LABEL,
        description: i18n.SOURCE_UNIT_LABEL,
        value: null,
        color: euiColorVis2,
        icon: 'visMapCoordinate',
      },
      {
        key: 'uniqueDestinationIps',
        name: i18n.DESTINATION_CHART_LABEL,
        description: i18n.DESTINATION_UNIT_LABEL,
        value: null,
        color: euiColorVis3,
        icon: 'visMapCoordinate',
      },
    ],
    enableAreaChart: true,
    enableBarChart: true,
    grow: 4,
    description: i18n.UNIQUE_IPS,
  },
];
