/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';

import euiStyled from '../../../../../../../../common/eui_styled_components';
import { LogEntryCategory } from '../../../../../../common/http_api/log_analysis';
import { RegularExpressionRepresentation } from './category_expression';
import { DatasetsList } from './datasets_list';
import { SingleMetricSparkline } from './single_metric_sparkline';
import { TimeRange } from '../../../../../../common/http_api/shared';

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
    const columns: Array<EuiBasicTableColumn<LogEntryCategory>> = useMemo(
      () => [
        {
          field: 'logEntryCount',
          name: i18n.translate('xpack.infra.logs.logEntryCategories.countColumnTitle', {
            defaultMessage: 'Message count',
          }),
          width: '300px',
          render: (logEntryCount, item) => {
            return (
              <EuiFlexGroup>
                <RightAlignedFlexItem>{numeral(logEntryCount).format('0,0')}</RightAlignedFlexItem>
                <EuiFlexItem grow={false}>
                  <SingleMetricSparkline
                    metric={item.histogramBuckets.map(
                      ({ startTime: timestamp, logEntryCount: value }) => ({
                        timestamp,
                        value,
                      })
                    )}
                    timeRange={timeRange}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          },
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
          field: 'maximumAnomalyScore',
          name: i18n.translate(
            'xpack.infra.logs.logEntryCategories.maximumAnomalyScoreColumnTitle',
            {
              defaultMessage: 'Maximum anomaly score',
            }
          ),
          width: '200px',
        },
      ],
      [timeRange]
    );

    const datasetFilterPlaceholder = i18n.translate(
      'xpack.infra.logs.logEntryCategories.datasetFilterPlaceholder',
      {
        defaultMessage: 'Select data sets',
      }
    );
    return (
      <>
        <EuiComboBox placeholder={datasetFilterPlaceholder} />
        <EuiSpacer />
        <EuiBasicTable
          columns={columns}
          items={topCategories}
          rowProps={{ className: `${className} euiTableRow--topAligned` }}
        />
      </>
    );
  }
)`
  &.euiTableRow--topAligned .euiTableRowCell {
    vertical-align: top;
  }
`;

const RightAlignedFlexItem = euiStyled(EuiFlexItem)`
  text-align: right;
`;
