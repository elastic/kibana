/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Datum,
  Flame,
  FlameLayerValue,
  PartialTheme,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { Maybe } from '@kbn/observability-plugin/common/typings';
import type { ElasticFlameGraph } from '@kbn/profiling-data-access-plugin/common/flamegraph';
import React, { useEffect, useMemo, useState } from 'react';
import { AddDataTabs } from '../../../common';
import { ComparisonMode } from '../../../common/normalization_options';
import { getFlamegraphModel } from '../../utils/get_flamegraph_model';
import { FrameInformationWindow } from '../frame_information_window';
import { FrameInformationFlyout } from '../frame_information_window/frame_information_flyout';
import { FlameGraphTooltip } from './flamegraph_tooltip';
import { FlameGraphLegend } from './flame_graph_legend';

interface Props {
  id: string;
  data?: ElasticFlameGraph;
  comparisonData?: ElasticFlameGraph;
  searchText?: string;
  onSearchTextChange?: (searchText: string) => void;
  onShowInformationWindowOpen?: () => void;
  comparisonMode?: ComparisonMode;
  baselineScaleFactor?: number;
  comparisonScaleFactor?: number;
  elasticWebsiteUrl: string;
  dockLinkVersion: string;
  onUploadSymbolsClick: (tab: AddDataTabs) => void;
}

export function FlameGraph({
  id,
  data,
  comparisonData,
  searchText,
  onSearchTextChange,
  onShowInformationWindowOpen,
  comparisonMode,
  baselineScaleFactor,
  comparisonScaleFactor,
  dockLinkVersion,
  elasticWebsiteUrl,
  onUploadSymbolsClick,
}: Props) {
  const theme = useEuiTheme();
  const [showInformationWindow, setShowInformationWindow] = useState(false);

  const columnarData = useMemo(() => {
    return getFlamegraphModel({
      primaryFlamegraph: data,
      comparisonFlamegraph: comparisonData,
      colorSuccess: theme.euiTheme.colors.success,
      colorDanger: theme.euiTheme.colors.danger,
      colorNeutral: theme.euiTheme.colors.lightShade,
      comparisonMode,
      baseline: baselineScaleFactor,
      comparison: comparisonScaleFactor,
    });
  }, [
    baselineScaleFactor,
    comparisonData,
    comparisonMode,
    comparisonScaleFactor,
    data,
    theme.euiTheme.colors.danger,
    theme.euiTheme.colors.lightShade,
    theme.euiTheme.colors.success,
  ]);

  const chartTheme: PartialTheme = {
    chartMargins: { top: 0, left: 0, bottom: 0, right: 0 },
    chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
    tooltip: { maxWidth: 500 },
  };

  const totalSamples = columnarData.viewModel.value[0];

  const [highlightedVmIndex, setHighlightedVmIndex] = useState<number | undefined>(undefined);

  const selected: undefined | React.ComponentProps<typeof FrameInformationWindow>['frame'] =
    data && highlightedVmIndex !== undefined
      ? {
          fileID: data.FileID[highlightedVmIndex],
          frameType: data.FrameType[highlightedVmIndex],
          exeFileName: data.ExeFilename[highlightedVmIndex],
          addressOrLine: data.AddressOrLine[highlightedVmIndex],
          functionName: data.FunctionName[highlightedVmIndex],
          sourceFileName: data.SourceFilename[highlightedVmIndex],
          sourceLine: data.SourceLine[highlightedVmIndex],
          countInclusive: data.CountInclusive[highlightedVmIndex],
          countExclusive: data.CountExclusive[highlightedVmIndex],
        }
      : undefined;

  useEffect(() => {
    setHighlightedVmIndex(undefined);
  }, [columnarData.key]);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            {columnarData.viewModel.label.length > 0 && (
              <EuiFlexItem grow>
                <Chart key={columnarData.key}>
                  <Settings
                    theme={chartTheme}
                    onElementClick={(elements) => {
                      const selectedElement = elements[0] as Maybe<FlameLayerValue>;
                      if (Number.isNaN(selectedElement?.vmIndex)) {
                        setHighlightedVmIndex(undefined);
                      } else {
                        setHighlightedVmIndex(selectedElement!.vmIndex);
                      }
                    }}
                  />
                  <Tooltip
                    actions={[{ label: '', onSelect: () => {} }]}
                    customTooltip={(props) => {
                      if (!data) {
                        return <></>;
                      }

                      const valueIndex = props.values[0].valueAccessor as number;
                      const label = data.Label[valueIndex];
                      const countInclusive = data.CountInclusive[valueIndex];
                      const countExclusive = data.CountExclusive[valueIndex];
                      const totalSeconds = data.TotalSeconds;
                      const nodeID = data.ID[valueIndex];

                      const comparisonNode = columnarData.comparisonNodesById[nodeID];

                      return (
                        <FlameGraphTooltip
                          isRoot={valueIndex === 0}
                          label={label}
                          countInclusive={countInclusive}
                          countExclusive={countExclusive}
                          totalSamples={totalSamples}
                          totalSeconds={totalSeconds}
                          comparisonCountInclusive={comparisonNode?.CountInclusive}
                          comparisonCountExclusive={comparisonNode?.CountExclusive}
                          comparisonTotalSamples={comparisonData?.CountInclusive[0]}
                          comparisonTotalSeconds={comparisonData?.TotalSeconds}
                          baselineScaleFactor={baselineScaleFactor}
                          comparisonScaleFactor={comparisonScaleFactor}
                          onShowMoreClick={() => {
                            if (!showInformationWindow) {
                              if (onShowInformationWindowOpen) {
                                onShowInformationWindowOpen();
                              }
                              setShowInformationWindow(true);
                            }
                            setHighlightedVmIndex(valueIndex);
                          }}
                        />
                      );
                    }}
                  />
                  <Flame
                    id={id}
                    columnarData={columnarData.viewModel}
                    valueAccessor={(d: Datum) => d.value as number}
                    valueFormatter={(value) => `${value}`}
                    animation={{ duration: 100 }}
                    controlProviderCallback={{}}
                    search={searchText ? { text: searchText } : undefined}
                    onSearchTextChange={onSearchTextChange}
                  />
                </Chart>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FlameGraphLegend legendItems={columnarData.legendItems} asScale={!!comparisonData} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showInformationWindow && (
        <FrameInformationFlyout
          onClose={() => setShowInformationWindow(false)}
          frame={selected}
          totalSeconds={data?.TotalSeconds ?? 0}
          totalSamples={totalSamples}
          samplingRate={data?.SamplingRate ?? 1.0}
          dockLinkVersion={dockLinkVersion}
          elasticWebsiteUrl={elasticWebsiteUrl}
          onUploadSymbolsClick={onUploadSymbolsClick}
        />
      )}
    </>
  );
}
