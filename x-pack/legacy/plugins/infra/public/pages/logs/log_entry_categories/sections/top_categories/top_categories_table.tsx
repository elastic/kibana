/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import euiStyled from '../../../../../../../../common/eui_styled_components';
import {
  LogEntryCategory,
  LogEntryCategoryHistogram,
} from '../../../../../../common/http_api/log_analysis';
import { TimeRange } from '../../../../../../common/http_api/shared';
import { RegularExpressionRepresentation } from './category_expression';
import { DatasetsList } from './datasets_list';
import { LogEntryCountSparkline } from './log_entry_count_sparkline';
import { AnomalySeverityIndicator } from './anomaly_severity_indicator';

export const TopCategoriesTable = euiStyled(
  ({
    className,
    timeRange,
    topCategories,
  }: {
    className?: string;
    timeRange: TimeRange;
    topCategories: LogEntryCategory[];
  }) => {
    const columns = useMemo(() => createColumns(timeRange), [timeRange]);

    return (
      <EuiBasicTable
        columns={columns}
        items={topCategories}
        rowProps={{ className: `${className} euiTableRow--topAligned` }}
      />
    );
  }
)`
  &.euiTableRow--topAligned .euiTableRowCell {
    vertical-align: top;
  }
`;

const createColumns = (timeRange: TimeRange): Array<EuiBasicTableColumn<LogEntryCategory>> => [
  {
    align: 'right',
    field: 'logEntryCount',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.countColumnTitle', {
      defaultMessage: 'Message count',
    }),
    render: (logEntryCount: number) => {
      return numeral(logEntryCount).format('0,0');
    },
    width: '120px',
  },
  {
    field: 'histograms',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.trendColumnTitle', {
      defaultMessage: 'Trend',
    }),
    render: (histograms: LogEntryCategoryHistogram[], item) => {
      return (
        <LogEntryCountSparkline
          currentCount={item.logEntryCount}
          histograms={histograms}
          timeRange={timeRange}
        />
      );
    },
    width: '200px',
  },
  {
    field: 'regularExpression',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.categoryColumnTitle', {
      defaultMessage: 'Category',
    }),
    truncateText: true,
    render: (regularExpression: string) => (
      <RegularExpressionRepresentation regularExpression={regularExpression} />
    ),
  },
  {
    field: 'datasets',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.datasetColumnTitle', {
      defaultMessage: 'Data sets',
    }),
    render: (datasets: string[]) => <DatasetsList datasets={datasets} />,
    width: '200px',
  },
  {
    align: 'right',
    field: 'maximumAnomalyScore',
    name: i18n.translate('xpack.infra.logs.logEntryCategories.maximumAnomalyScoreColumnTitle', {
      defaultMessage: 'Maximum anomaly score',
    }),
    render: (maximumAnomalyScore: number) => (
      <AnomalySeverityIndicator anomalyScore={maximumAnomalyScore} />
    ),
    width: '200px',
  },
];
