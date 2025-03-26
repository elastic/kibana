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
import {
  DATASET_QUALITY_RULE_RUNTIME_FIELD_MAPPING,
  DATASET_QUALITY_RULE_RUNTIME_FIELD_NAME,
} from '../../../common/constants';
import { useKibanaContextForPlugin } from '../../utils';

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
    services: { lens },
  } = useKibanaContextForPlugin();

  const { euiTheme } = useEuiTheme();

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
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default RuleConditionChart;
