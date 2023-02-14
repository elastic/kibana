/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { CalloutSummary } from './callout_summary';
import { EcsSummaryDonutChart } from '../../../ecs_summary_donut_chart';
import { ALL_TAB_ID } from '../../index_properties/helpers';
import type { IlmPhase, PartitionedFieldMetadata } from '../../../types';

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  addToNewCaseDisabled: boolean;
  defaultNumberFormat: string;
  docsCount: number;
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
  ilmPhase: IlmPhase | undefined;
  indexName: string;
  onAddToNewCase: (markdownComments: string[]) => void;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  pattern: string;
  patternDocsCount: number;
  setSelectedTabId: (tabId: string) => void;
  theme: Theme;
}

const SummaryTabComponent: React.FC<Props> = ({
  addSuccessToast,
  addToNewCaseDisabled,
  defaultNumberFormat,
  docsCount,
  getGroupByFieldsOnClick,
  ilmPhase,
  indexName,
  onAddToNewCase,
  partitionedFieldMetadata,
  pattern,
  patternDocsCount,
  setSelectedTabId,
  theme,
}) => (
  <>
    <CalloutSummary
      addSuccessToast={addSuccessToast}
      addToNewCaseDisabled={addToNewCaseDisabled}
      defaultNumberFormat={defaultNumberFormat}
      docsCount={docsCount}
      ilmPhase={ilmPhase}
      indexName={indexName}
      onAddToNewCase={onAddToNewCase}
      partitionedFieldMetadata={partitionedFieldMetadata}
      pattern={pattern}
      patternDocsCount={patternDocsCount}
    />

    <EcsSummaryDonutChart
      defaultTabId={ALL_TAB_ID}
      getGroupByFieldsOnClick={getGroupByFieldsOnClick}
      partitionedFieldMetadata={partitionedFieldMetadata}
      setSelectedTabId={setSelectedTabId}
      theme={theme}
    />
  </>
);

SummaryTabComponent.displayName = 'SummaryTabComponent';

export const SummaryTab = React.memo(SummaryTabComponent);
