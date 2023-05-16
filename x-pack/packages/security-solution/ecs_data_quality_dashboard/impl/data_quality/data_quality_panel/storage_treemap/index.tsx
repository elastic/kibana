/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type {
  Datum,
  ElementClickListener,
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartialTheme,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import {
  FlattenedBucket,
  getLayersMultiDimensional,
  getLegendItems,
  getPathToFlattenedBucketMap,
} from '../body/data_quality_details/storage_details/helpers';
import { ChartLegendItem } from '../../ecs_summary_donut_chart/chart_legend/chart_legend_item';
import { NoData } from './no_data';
import { ChartFlexItem, LegendContainer } from '../tabs/styles';
import { PatternRollup, SelectedIndex } from '../../types';

export const DEFAULT_MIN_CHART_HEIGHT = 240; // px
export const LEGEND_WIDTH = 220; // px
export const LEGEND_TEXT_WITH = 120; // px

export interface Props {
  flattenedBuckets: FlattenedBucket[];
  formatBytes: (value: number | undefined) => string;
  maxChartHeight?: number;
  minChartHeight?: number;
  onIndexSelected: ({ indexName, pattern }: SelectedIndex) => void;
  patternRollups: Record<string, PatternRollup>;
  patterns: string[];
  theme: Theme;
}

interface GetGroupByFieldsResult {
  pattern: string;
  indexName: string;
}

export const getGroupByFieldsOnClick = (
  elements: Array<
    | FlameElementEvent
    | HeatmapElementEvent
    | MetricElementEvent
    | PartitionElementEvent
    | WordCloudElementEvent
    | XYChartElementEvent
  >
): GetGroupByFieldsResult => {
  const flattened = elements.flat(2);

  const pattern =
    flattened.length > 0 && 'groupByRollup' in flattened[0] && flattened[0].groupByRollup != null
      ? `${flattened[0].groupByRollup}`
      : '';

  const indexName =
    flattened.length > 1 && 'groupByRollup' in flattened[1] && flattened[1].groupByRollup != null
      ? `${flattened[1].groupByRollup}`
      : '';

  return {
    pattern,
    indexName,
  };
};

const StorageTreemapComponent: React.FC<Props> = ({
  flattenedBuckets,
  formatBytes,
  maxChartHeight,
  minChartHeight = DEFAULT_MIN_CHART_HEIGHT,
  onIndexSelected,
  patternRollups,
  patterns,
  theme,
}: Props) => {
  const fillColor = useMemo(() => theme.background.color, [theme.background.color]);

  const treemapTheme: PartialTheme[] = useMemo(
    () => [
      {
        partition: {
          fillLabel: { valueFont: { fontWeight: 700 } },
          idealFontSizeJump: 1.15,
          maxFontSize: 16,
          minFontSize: 4,
          sectorLineStroke: fillColor, // draws the light or dark "lines" between partitions
          sectorLineWidth: 1.5,
        },
      },
    ],
    [fillColor]
  );

  const onElementClick: ElementClickListener = useCallback(
    (event) => {
      const { indexName, pattern } = getGroupByFieldsOnClick(event);

      if (!isEmpty(indexName) && !isEmpty(pattern)) {
        onIndexSelected({ indexName, pattern });
      }
    },
    [onIndexSelected]
  );

  const pathToFlattenedBucketMap = getPathToFlattenedBucketMap(flattenedBuckets);

  const layers = useMemo(
    () =>
      getLayersMultiDimensional({
        formatBytes,
        layer0FillColor: fillColor,
        pathToFlattenedBucketMap,
      }),
    [fillColor, formatBytes, pathToFlattenedBucketMap]
  );

  const valueAccessor = useCallback(({ sizeInBytes }: Datum) => sizeInBytes, []);

  const legendItems = useMemo(
    () => getLegendItems({ patterns, flattenedBuckets, patternRollups }),
    [flattenedBuckets, patternRollups, patterns]
  );

  if (flattenedBuckets.length === 0) {
    return <NoData />;
  }

  return (
    <EuiFlexGroup data-test-subj="storageTreemap" gutterSize="none">
      <ChartFlexItem grow={true} $maxChartHeight={maxChartHeight} $minChartHeight={minChartHeight}>
        {flattenedBuckets.length === 0 ? (
          <NoData />
        ) : (
          <Chart>
            <Settings
              baseTheme={theme}
              showLegend={false}
              theme={treemapTheme}
              onElementClick={onElementClick}
            />
            <Partition
              data={flattenedBuckets}
              id="spec_1"
              layers={layers}
              layout={PartitionLayout.treemap}
              valueAccessor={valueAccessor}
              valueFormatter={(d: number) => formatBytes(d)}
            />
          </Chart>
        )}
      </ChartFlexItem>

      <EuiFlexItem grow={false}>
        <LegendContainer
          data-test-subj="legend"
          $height={maxChartHeight}
          className="eui-yScroll"
          $width={LEGEND_WIDTH}
        >
          {legendItems.map(({ color, ilmPhase, index, pattern, sizeInBytes }) => (
            <ChartLegendItem
              color={color}
              count={formatBytes(sizeInBytes)}
              dataTestSubj={`chart-legend-item-${ilmPhase}${pattern}${index}`}
              key={`${ilmPhase}${pattern}${index}`}
              onClick={
                index != null && pattern != null
                  ? () => {
                      onIndexSelected({ indexName: index, pattern });
                    }
                  : undefined
              }
              text={index ?? pattern}
              textWidth={LEGEND_TEXT_WITH}
            />
          ))}
        </LegendContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const StorageTreemap = React.memo(StorageTreemapComponent);
