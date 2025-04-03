/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { DataView, RuntimeField } from '@kbn/data-views-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  LensAttributes,
  LensAttributesBuilder,
  XYByValueAnnotationsLayer,
  XYChart,
  XYDataLayer,
  XYLayerOptions,
  XYReferenceLinesLayer,
} from '@kbn/lens-embeddable-utils';
import { FillStyle, SeriesType } from '@kbn/lens-plugin/public';
import { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import React, { useEffect, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import numeral from '@elastic/numeral';
import {
  DATASET_QUALITY_RULE_RUNTIME_FIELD_MAPPING,
  DATASET_QUALITY_RULE_RUNTIME_FIELD_NAME,
} from '../../../common/constants';
import { useKibanaContextForPlugin } from '../../utils';
import { ChartPreview } from './chart_preview';
import { LoadingState, NoDataState } from './chart_preview_helper';

export type Maybe<T> = T | null | undefined;

const MAX_BREAKDOWN_SERIES = 5;

interface ChartOptions {
  seriesType?: SeriesType;
  interval?: string;
}

export interface RuleConditionChartProps {
  threshold: number[];
  comparator: COMPARATORS;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
  label?: string;
  dataView?: DataView;
  groupBy?: string | string[];
  timeRange: TimeRange;
  chartOptions?: ChartOptions;
}

// _.isNumber() returns true for NaN, _.isFinite() does not refine
export function isFiniteNumber(value: any): value is number {
  return isFinite(value);
}

export function asPercent(
  numerator: Maybe<number>,
  denominator: number | undefined,
  fallbackResult = 'N/A'
) {
  if (!denominator || !isFiniteNumber(numerator)) {
    return fallbackResult;
  }

  const decimal = numerator / denominator;

  // 33.2 => 33%
  // 3.32 => 3.3%
  // 0 => 0%
  if (Math.abs(decimal) >= 0.1 || decimal === 0) {
    return numeral(decimal).format('0%');
  }

  return numeral(decimal).format('0.000%');
}

export const getBufferThreshold = (threshold?: number): string =>
  (Math.ceil((threshold || 0) * 1.1 * 100) / 100).toFixed(2).toString();

export function RuleConditionChart({
  threshold,
  comparator,
  timeSize,
  timeUnit,
  label,
  dataView,
  groupBy,
  timeRange,
  chartOptions: { seriesType, interval } = {},
}: RuleConditionChartProps) {
  const {
    services: { lens, http },
  } = useKibanaContextForPlugin();

  const { euiTheme } = useEuiTheme();

  const [series, setSeries] = useState<any[]>([]);
  const [totalGroups, setTotalGroups] = useState<number>(0);

  console.log(threshold);

  useEffect(() => {
    const abortController = new AbortController();
    if (http && dataView && timeSize && timeRange?.from && timeRange?.to) {
      http
        .get<any>('/internal/dataset_quality/rule_types/degraded_docs/chart_preview', {
          signal: abortController.signal,
          query: {
            index: dataView?.getIndexPattern(),
            start: timeRange?.from,
            end: timeRange?.to,
            interval: interval || `${timeSize}${timeUnit}`,
            groupBy: ['_index'],
          },
        })
        .then((data) => {
          setTotalGroups(data.degradedDocsChartPreview.totalGroups);
          setSeries(data.degradedDocsChartPreview.series);
          console.log(data);
        });
    }
    return () => {
      abortController.abort();
    };
  }, [dataView, groupBy, http, interval, timeRange?.from, timeRange?.to, timeSize, timeUnit]);

  const chartPreview = threshold && threshold.length > 0 && series.length > 0 && (
    <ChartPreview
      series={series}
      threshold={threshold[0]}
      yTickFormat={(d: number | null) => asPercent(d, 100)}
      timeSize={timeSize}
      timeUnit={timeUnit}
      totalGroups={totalGroups}
    />
  );

  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const [attributes, setAttributes] = useState<LensAttributes>();
  const [thresholdReferenceLine, setThresholdReferenceLine] = useState<XYReferenceLinesLayer[]>();

  const formula = "count(kql='_ignored:*')/count()";

  useEffect(() => {
    if (!dataView) {
      return;
    }

    // _index will contain the backing index rather than the data stream index pattern, so we need
    // to extract and save temprorarily in a runtime field
    dataView.addRuntimeField(
      DATASET_QUALITY_RULE_RUNTIME_FIELD_NAME,
      DATASET_QUALITY_RULE_RUNTIME_FIELD_MAPPING as RuntimeField
    );
  }, [dataView]);

  // Build the threshold reference line
  useEffect(() => {
    if (!threshold) return;
    const refLayers = [];

    if (
      comparator === COMPARATORS.NOT_BETWEEN ||
      (comparator === COMPARATORS.BETWEEN && threshold.length === 2)
    ) {
      const refLineStart = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[0] / 100 || 0).toString(),
            color: euiTheme.colors.danger,
            fill: comparator === COMPARATORS.NOT_BETWEEN ? 'below' : 'none',
          },
        ],
      });
      const refLineEnd = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[1] / 100 || 0).toString(),
            color: euiTheme.colors.danger,
            fill: comparator === COMPARATORS.NOT_BETWEEN ? 'above' : 'none',
          },
        ],
      });

      refLayers.push(refLineStart, refLineEnd);
    } else {
      let fill: FillStyle = 'above';
      if (comparator === COMPARATORS.LESS_THAN || comparator === COMPARATORS.LESS_THAN_OR_EQUALS) {
        fill = 'below';
      }
      const thresholdRefLine = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[0] / 100 || 0).toString(),
            color: euiTheme.colors.danger,
            fill,
          },
        ],
      });
      // A transparent line to add extra buffer at the top of threshold
      const bufferRefLine = new XYReferenceLinesLayer({
        data: [
          {
            value: getBufferThreshold(threshold[0] / 100),
            color: 'transparent',
            fill,
          },
        ],
      });
      refLayers.push(thresholdRefLine, bufferRefLine);
    }
    setThresholdReferenceLine(refLayers);
  }, [threshold, comparator, euiTheme.colors.danger]);

  useEffect(() => {
    if (!formulaAsync.value || !dataView /* || !adHocDataView */) {
      return;
    }

    const baseLayer = {
      type: 'formula',
      value: formula,
      label: label ?? formula,
      format: {
        id: 'percent',
        params: {
          decimals: 3,
        },
      },
    };
    const xYDataLayerOptions: XYLayerOptions = {
      buckets: {
        type: 'date_histogram',
        params: {
          interval: interval || `${timeSize}${timeUnit}`,
        },
      },
      seriesType: seriesType ? seriesType : 'bar',
    };

    if (groupBy && groupBy?.length) {
      xYDataLayerOptions.breakdown = {
        type: 'top_values',
        field: groupBy[0],
        params: {
          size: MAX_BREAKDOWN_SERIES,
          secondaryFields: (groupBy as string[]).slice(1),
          accuracyMode: false,
          orderDirection: 'desc',
          orderBy: { type: 'custom' },
          orderAgg: {
            label: 'count',
            dataType: 'number',
            operationType: 'count',
            sourceField: '"undefined"',
            isBucketed: false,
            scale: 'ratio',
          },
        },
      };
    }

    const xyDataLayer = new XYDataLayer({
      data: [baseLayer].map((layer) => ({
        type: layer.type,
        value: layer.value,
        label: layer.label,
        format: layer.format,
      })),
      options: xYDataLayerOptions,
    });

    const layers: Array<XYDataLayer | XYReferenceLinesLayer | XYByValueAnnotationsLayer> = [
      xyDataLayer,
    ];
    if (thresholdReferenceLine) {
      layers.push(...thresholdReferenceLine);
    }
    const attributesLens = new LensAttributesBuilder({
      visualization: new XYChart({
        visualOptions: {
          valueLabels: 'hide',
          axisTitlesVisibilitySettings: {
            x: true,
            yLeft: false,
            yRight: true,
          },
        },
        layers,
        formulaAPI: formulaAsync.value?.formula,
        dataView,
      }),
    }).build();

    const lensBuilderAtt = { ...attributesLens, type: 'lens' };

    setAttributes(lensBuilderAtt);
  }, [
    comparator,
    dataView,
    label,
    formula,
    groupBy,
    interval,
    threshold,
    thresholdReferenceLine,
    timeSize,
    timeUnit,
    seriesType,
    formulaAsync.value?.formula,
    formulaAsync.value,
  ]);

  if (!dataView || !attributes || !timeSize || !timeRange) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          titleSize="xxs"
          data-test-subj="datasetQualityRuleNoChartData"
          body={
            <FormattedMessage
              id="xpack.datasetQuality.rule.charts.noData.title"
              defaultMessage="No chart data available, check the rule"
            />
          }
        />
      </div>
    );
  }
  return (
    <div>
      <lens.EmbeddableComponent
        id="ruleConditionChart"
        style={{ height: 180 }}
        timeRange={timeRange}
        attributes={attributes}
        disableTriggers={true}
        query={{
          language: 'kuery',
          query: '',
        }}
      />
      {chartPreview}
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default RuleConditionChart;
