/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  formatNumber,
  useEuiTheme,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { ScaleType, Settings, Axis, Chart, BarSeries, Position } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';

import { NUMBER_FORMAT } from '../../../../common/constants';
import {
  flyoutDocsCountTotalText,
  lastOccurrenceColumnName,
  flyoutIssueDetailsTitle,
} from '../../../../common/translations';
import { useQualityIssues } from '../../../hooks';
import type { QualityIssue } from '../../../../common/api_types';

export const QualityIssueFieldInfo = ({
  fieldList,
  children,
}: {
  fieldList?: QualityIssue;
  children?: React.ReactNode;
}) => {
  const { fieldFormats } = useQualityIssues();
  const chartBaseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const dateFormatter = fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [
    ES_FIELD_TYPES.DATE,
  ]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <span>{flyoutIssueDetailsTitle}</span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <span>{flyoutDocsCountTotalText}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem
            data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-docCount`}
            grow={false}
          >
            <span>{formatNumber(fieldList?.count, NUMBER_FORMAT)}</span>
          </EuiFlexItem>
        </EuiFlexGroup>
        {fieldList?.timeSeries && (
          <>
            <EuiSpacer size="s" />
            <Chart
              size={{ height: 150, width: '100%' }}
              data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldsList-docCountChart"
            >
              <Settings showLegend={false} locale={i18n.getLocale()} baseTheme={chartBaseTheme} />
              <Axis
                id="doc_count_x_axis"
                position={Position.Bottom}
                tickFormat={(d) => dateFormatter.convert(d)}
              />
              <Axis id="doc_count_y_axis" position={Position.Left} />
              <BarSeries
                id="Doc count"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                yNice={true}
                xNice={true}
                xAccessor="x"
                yAccessors={['y']}
                data={fieldList?.timeSeries}
                color={euiTheme.colors.vis.euiColorVis6}
              />
            </Chart>
          </>
        )}
      </EuiFlexItem>
      <EuiFlexGroup
        alignItems="center"
        data-test-subj={`datasetQualityDetailsDegradedFieldFlyoutFieldsList-lastOccurrence`}
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <span>{lastOccurrenceColumnName}</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldValue-lastOccurrence"
          grow={false}
        >
          <span>{dateFormatter.convert(fieldList?.lastOccurrence)}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
      {children}
    </EuiFlexGroup>
  );
};
