/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
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

interface MetricListProps {
  avgCpuUsage?: number;
  avgErrorsPerMinute?: number;
  avgMemoryUsage?: number;
  avgReqPerMinute?: number;
  avgTransDurationMs?: number;
}

const na = i18n.translate('xpack.apm.serviceMap.NotAvailableMetric', {
  defaultMessage: 'N/A'
});

export function MetricList({
  avgCpuUsage,
  avgErrorsPerMinute,
  avgMemoryUsage,
  avgReqPerMinute,
  avgTransDurationMs
}: MetricListProps) {
  const listItems = [
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgTransDurationPopoverMetric',
        {
          defaultMessage: 'Trans. duration (avg.)'
        }
      ),
      description: avgTransDurationMs
        ? asDuration(toMicroseconds(avgTransDurationMs, 'milliseconds'))
        : na
    },
    {
      title: i18n.translate(
        'xpack.apm.serviceMap.avgReqPerMinutePopoverMetric',
        {
          defaultMessage: 'Req. per minute (avg.)'
        }
      ),
      description: avgReqPerMinute
        ? `${avgReqPerMinute} ${tpmUnit('request')}`
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
      description: avgCpuUsage ? asPercent(avgCpuUsage, 1) : na
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.avgCpuUsagePopoverMetric', {
        defaultMessage: 'Memory usage (avg.)'
      }),
      description: avgMemoryUsage ? asPercent(avgMemoryUsage, 1) : na
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
