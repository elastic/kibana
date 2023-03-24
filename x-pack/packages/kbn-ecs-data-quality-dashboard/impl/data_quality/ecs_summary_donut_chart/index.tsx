/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  PartitionLayer,
} from '@elastic/charts';
import { Chart, Partition, PartitionLayout, Settings } from '@elastic/charts';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { ChartLegend } from './chart_legend';
import {
  getFillColor,
  getNodeLabel,
  getSummaryData,
  getTabId,
} from '../data_quality_panel/tabs/summary_tab/helpers';
import { allMetadataIsEmpty } from './helpers';
import * as i18n from './translations';
import type { PartitionedFieldMetadata } from '../types';

export const DEFAULT_HEIGHT = 180; // px

const DonutTextWrapper = styled(EuiFlexGroup)`
  max-width: 77px;
  position: absolute;
  top: 40%;
  width: 100%;
  z-index: 1;
`;

const CenteredFlexItem = styled(EuiFlexItem)`
  align-items: center;
  position: relative;
`;

const donutTheme: PartialTheme = {
  chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
  partition: {
    idealFontSizeJump: 1.1,
    outerSizeRatio: 1,
    emptySizeRatio: 0.8,
    circlePadding: 4,
  },
};

interface Props {
  defaultTabId: string;
  getGroupByFieldsOnClick: (
    elements: Array<
      | FlameElementEvent
      | HeatmapElementEvent
      | MetricElementEvent
      | PartitionElementEvent
      | WordCloudElementEvent
      | XYChartElementEvent
    >
  ) => {
    groupByField0: string;
    groupByField1: string;
  };
  height?: number;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
  theme: Theme;
}

const EcsSummaryDonutChartComponent: React.FC<Props> = ({
  defaultTabId,
  getGroupByFieldsOnClick,
  height = DEFAULT_HEIGHT,
  partitionedFieldMetadata,
  setSelectedTabId,
  theme,
}) => {
  const summaryData = useMemo(
    () => getSummaryData(partitionedFieldMetadata),
    [partitionedFieldMetadata]
  );
  const valueAccessor = useCallback((d: Datum) => d.mappings as number, []);
  const valueFormatter = useCallback((d: number) => `${d}`, []);
  const layers = useMemo(
    (): PartitionLayer[] => [
      {
        groupByRollup: (d: Datum) => d.categoryId,
        nodeLabel: (d: Datum) => getNodeLabel(d),
        shape: {
          fillColor: getFillColor,
        },
      },
    ],
    []
  );
  const showDefaultTab = useCallback(
    () => setSelectedTabId(defaultTabId),
    [defaultTabId, setSelectedTabId]
  );
  const onElementClick: ElementClickListener = useCallback(
    (event) => {
      const { groupByField0 } = getGroupByFieldsOnClick(event);

      setSelectedTabId(getTabId(groupByField0));
    },
    [getGroupByFieldsOnClick, setSelectedTabId]
  );

  if (allMetadataIsEmpty(partitionedFieldMetadata)) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs">
        <h4 className="eui-textCenter">{i18n.CHART_TITLE}</h4>
      </EuiTitle>

      <EuiSpacer />

      <EuiFlexGroup
        alignItems="center"
        data-test-subj="donut-chart"
        gutterSize="l"
        justifyContent="center"
        responsive={false}
      >
        <CenteredFlexItem grow={false}>
          <DonutTextWrapper
            alignItems="center"
            direction="column"
            gutterSize="none"
            justifyContent="center"
          >
            <EuiFlexItem className="eui-textTruncate">
              <EuiButtonEmpty aria-label={i18n.FIELDS} color="text" onClick={showDefaultTab}>
                <EuiText size="m">{partitionedFieldMetadata.all.length}</EuiText>
                <EuiText className="eui-textTruncate" size="s">
                  {i18n.FIELDS}
                </EuiText>
              </EuiButtonEmpty>
            </EuiFlexItem>
          </DonutTextWrapper>

          <Chart size={height}>
            <Settings baseTheme={theme} onElementClick={onElementClick} theme={donutTheme} />
            <Partition
              data={summaryData}
              id="ecs-summary-donut-chart"
              layers={layers}
              layout={PartitionLayout.sunburst}
              valueAccessor={valueAccessor}
              valueFormatter={valueFormatter}
            />
          </Chart>
        </CenteredFlexItem>

        <EuiFlexItem grow={false}>
          <ChartLegend
            partitionedFieldMetadata={partitionedFieldMetadata}
            setSelectedTabId={setSelectedTabId}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

EcsSummaryDonutChartComponent.displayName = 'EcsSummaryDonutChartComponent';

export const EcsSummaryDonutChart = React.memo(EcsSummaryDonutChartComponent);
