/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { isNumber } from 'lodash';
import { ServiceNodeMetrics } from '../../../../../server/lib/service_map/get_service_map_service_node_info';
import {
  asDuration,
  asPercent,
  toMicroseconds,
  tpmUnit
} from '../../../../utils/formatters';

const ItemRow = styled('tr')`
  line-height: 2;
`;

const ItemTitle = styled('td')`
  color: ${lightTheme.textColors.subdued};
  padding-right: 1rem;
`;

const ItemDescription = styled('td')`
  text-align: right;
`;

const na = i18n.translate('xpack.apm.serviceMap.NotAvailableMetric', {
  defaultMessage: 'N/A'
});

export function MetricList({
  avgCpuUsage,
  avgErrorsPerMinute,
  avgMemoryUsage,
  avgRequestsPerMinute,
  avgTransactionDuration
}: ServiceNodeMetrics) {
  const listItems = [
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgTransDurationPopoverMetric',
        {
          defaultMessage: 'Trans. duration (avg.)'
        }
      ),
      description: isNumber(avgTransactionDuration)
        ? asDuration(toMicroseconds(avgTransactionDuration, 'milliseconds'))
        : na
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgReqPerMinutePopoverMetric',
        {
          defaultMessage: 'Req. per minute (avg.)'
        }
      ),
      description: isNumber(avgRequestsPerMinute)
        ? `${avgRequestsPerMinute} ${tpmUnit('request')}`
        : na
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgErrorsPerMinutePopoverMetric',
        {
          defaultMessage: 'Errors per minute (avg.)'
        }
      ),
      description: avgErrorsPerMinute ?? na
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.avgCpuUsagePopoverMetric', {
        defaultMessage: 'CPU usage (avg.)'
      }),
      description: isNumber(avgCpuUsage) ? asPercent(avgCpuUsage, 1) : na
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.avgCpuUsagePopoverMetric', {
        defaultMessage: 'Memory usage (avg.)'
      }),
      description: isNumber(avgMemoryUsage) ? asPercent(avgMemoryUsage, 1) : na
    }
  ];
  return (
    <table>
      <tbody>
        {listItems.map(({ title, description }) => (
          <ItemRow>
            <ItemTitle>{title}</ItemTitle>
            <ItemDescription>{description}</ItemDescription>
          </ItemRow>
        ))}
      </tbody>
    </table>
  );
}
