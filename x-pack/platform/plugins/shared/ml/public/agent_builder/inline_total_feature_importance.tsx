/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { RecursivePartial, AxisStyle, PartialTheme, BarSeriesProps } from '@elastic/charts';
import { Chart, Settings, Axis, ScaleType, Position, BarSeries } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import {
  isClassificationTotalFeatureImportance,
  isRegressionTotalFeatureImportance,
  type ClassificationTotalFeatureImportance,
  type DataFrameAnalysisConfigType,
  type FeatureImportanceClassName,
  type RegressionTotalFeatureImportance,
  type TotalFeatureImportance,
} from '@kbn/ml-data-frame-analytics-utils';
import type { MlLocator } from '../locator';
import { resultsExplorerAction, resultsExplorerHref } from './results_explorer_link';

interface Datum {
  featureName: string;
  meanImportance: number;
  className?: FeatureImportanceClassName;
}

type PlotData = Datum[];
type SeriesProps = Omit<BarSeriesProps, 'id' | 'xScaleType' | 'yScaleType' | 'data'>;

const CHART_PREVIEW_HEIGHT = 400;

const calculateTotalMeanImportance = (feature: ClassificationTotalFeatureImportance) =>
  feature.classes.reduce(
    (runningSum, featureClass) => runningSum + featureClass.importance.mean_magnitude,
    0
  );

const analysisTypeOf = (
  totalFeatureImportance: TotalFeatureImportance[]
): DataFrameAnalysisConfigType | undefined => {
  const first = totalFeatureImportance[0];
  if (isClassificationTotalFeatureImportance(first)) {
    return 'classification';
  }
  if (isRegressionTotalFeatureImportance(first)) {
    return 'regression';
  }
  return undefined;
};

export interface InlineTotalFeatureImportanceServices {
  charts: ChartsPluginStart;
  locator?: MlLocator;
}

/** Horizontal bar chart of trained-model total feature importance. */
export const InlineTotalFeatureImportance = ({
  jobId,
  analysisType,
  totalFeatureImportance,
  services,
  registerActionButtons,
}: {
  jobId: string;
  analysisType?: DataFrameAnalysisConfigType;
  totalFeatureImportance: TotalFeatureImportance[];
  services: InlineTotalFeatureImportanceServices;
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}) => {
  const { euiTheme } = useEuiTheme();
  const { useChartsBaseTheme } = services.charts.theme;
  const baseTheme = useChartsBaseTheme();

  const theme: PartialTheme = useMemo(() => {
    const axisColor = euiTheme.colors.mediumShade;
    const axes: RecursivePartial<AxisStyle> = {
      axisLine: { stroke: axisColor },
      tickLabel: { fontSize: 12, fill: axisColor },
      tickLine: { stroke: axisColor },
      gridLine: {
        horizontal: { dash: [1, 2] },
        vertical: { strokeWidth: 0 },
      },
    };
    return { axes, legend: { spacingBuffer: 100 } };
  }, [euiTheme]);

  const viewInHref = useMemo(
    () =>
      resultsExplorerHref(
        services.locator,
        jobId,
        analysisType ?? analysisTypeOf(totalFeatureImportance)
      ),
    [analysisType, jobId, services.locator, totalFeatureImportance]
  );

  const actionButtons = useMemo(() => resultsExplorerAction(viewInHref), [viewInHref]);

  useEffect(() => {
    registerActionButtons?.(actionButtons);
    return () => registerActionButtons?.([]);
  }, [actionButtons, registerActionButtons]);

  const [plotData, barSeriesSpec, showLegend] = useMemo<
    [PlotData, SeriesProps, boolean | undefined]
  >(() => {
    if (totalFeatureImportance.length < 1) {
      return [[], { xAccessor: 'featureName', yAccessors: ['meanImportance'] }, undefined];
    }

    if (isClassificationTotalFeatureImportance(totalFeatureImportance[0])) {
      if (totalFeatureImportance[0].classes.length === 2) {
        const sortedData = (totalFeatureImportance as ClassificationTotalFeatureImportance[])
          .map((feature) => ({
            featureName: feature.feature_name,
            meanImportance: feature.classes[0].importance.mean_magnitude,
          }))
          .sort((left, right) => right.meanImportance - left.meanImportance);
        return [
          sortedData,
          {
            xAccessor: 'featureName',
            yAccessors: ['meanImportance'],
            name: i18n.translate('xpack.ml.agentBuilder.dfa.featureImportance.magnitude', {
              defaultMessage: 'magnitude',
            }),
          },
          false,
        ];
      }

      if (totalFeatureImportance[0].classes.length > 2) {
        const sortedData: PlotData = [];
        (totalFeatureImportance as ClassificationTotalFeatureImportance[])
          .slice()
          .sort(
            (previous, current) =>
              calculateTotalMeanImportance(current) - calculateTotalMeanImportance(previous)
          )
          .forEach((feature) => {
            const sortedClasses = feature.classes
              .slice()
              .sort(
                (left, right) => right.importance.mean_magnitude - left.importance.mean_magnitude
              );
            sortedData.push(
              ...sortedClasses.map((featureClass) => ({
                featureName: feature.feature_name,
                meanImportance: featureClass.importance.mean_magnitude,
                className: featureClass.class_name,
              }))
            );
          });
        return [
          sortedData,
          {
            xAccessor: 'featureName',
            yAccessors: ['meanImportance'],
            splitSeriesAccessors: ['className'],
            stackAccessors: ['featureName'],
          },
          true,
        ];
      }
    }

    if (isRegressionTotalFeatureImportance(totalFeatureImportance[0])) {
      const sortedData = (totalFeatureImportance as RegressionTotalFeatureImportance[])
        .map((feature) => ({
          featureName: feature.feature_name,
          meanImportance: feature.importance.mean_magnitude,
        }))
        .sort((left, right) => right.meanImportance - left.meanImportance);
      return [
        sortedData,
        {
          xAccessor: 'featureName',
          yAccessors: ['meanImportance'],
          name: i18n.translate('xpack.ml.agentBuilder.dfa.featureImportance.magnitude', {
            defaultMessage: 'magnitude',
          }),
        },
        false,
      ];
    }

    return [[], { xAccessor: 'featureName', yAccessors: ['meanImportance'] }, undefined];
  }, [totalFeatureImportance]);

  const tickFormatter = useCallback((value: number) => Number(value.toPrecision(3)).toString(), []);

  if (plotData.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="mlAgentBuilderTotalFeatureImportanceChart">
      <div css={css({ position: 'relative', width: '100%', height: CHART_PREVIEW_HEIGHT })}>
        <Chart size={{ width: '100%', height: CHART_PREVIEW_HEIGHT }}>
          <Settings
            rotation={90}
            theme={theme}
            baseTheme={baseTheme}
            showLegend={showLegend}
            locale={i18n.getLocale()}
          />
          <Axis
            id="x-axis"
            title={i18n.translate('xpack.ml.agentBuilder.dfa.featureImportance.xAxis', {
              defaultMessage: 'Feature importance average magnitude',
            })}
            position={Position.Bottom}
            tickFormat={tickFormatter}
          />
          <Axis id="y-axis" title="" position={Position.Left} />
          <BarSeries
            id="magnitude"
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            data={plotData}
            {...barSeriesSpec}
          />
        </Chart>
      </div>
    </div>
  );
};
