/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiBadge } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import React from 'react';

import { AllTab } from './all_tab';
import { CustomTab } from './custom_tab';
import { getCustomColor } from './custom_tab/helpers';
import { EcsCompliantTab } from './ecs_compliant_tab';
import { IncompatibleTab } from './incompatible_tab';
import { getIncompatibleColor } from './incompatible_tab/helpers';
import {
  ALL_TAB_ID,
  ECS_COMPLIANT_TAB_ID,
  INCOMPATIBLE_TAB_ID,
  SUMMARY_TAB_ID,
} from '../index_properties/helpers';
import { getMarkdownComment } from '../index_properties/markdown/helpers';
import { getFillColor } from './summary_tab/helpers';
import * as i18n from '../index_properties/translations';
import { SummaryTab } from './summary_tab';
import type { EnrichedFieldMetadata, IlmPhase, PartitionedFieldMetadata } from '../../types';

export const getMissingTimestampComment = (): string =>
  getMarkdownComment({
    suggestedAction: `${i18n.MISSING_TIMESTAMP_CALLOUT}

${i18n.DETECTION_ENGINE_RULES_MAY_NOT_MATCH}
${i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}
`,
    title: i18n.MISSING_TIMESTAMP_CALLOUT_TITLE,
  });

export const showMissingTimestampCallout = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): boolean => enrichedFieldMetadata.length === 0;

export const getEcsCompliantColor = (partitionedFieldMetadata: PartitionedFieldMetadata): string =>
  showMissingTimestampCallout(partitionedFieldMetadata.ecsCompliant)
    ? euiThemeVars.euiColorDanger
    : getFillColor('ecs-compliant');

export const getTabs = ({
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
}: {
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
}) => [
  {
    content: (
      <SummaryTab
        addSuccessToast={addSuccessToast}
        addToNewCaseDisabled={addToNewCaseDisabled}
        defaultNumberFormat={defaultNumberFormat}
        docsCount={docsCount}
        getGroupByFieldsOnClick={getGroupByFieldsOnClick}
        ilmPhase={ilmPhase}
        indexName={indexName}
        onAddToNewCase={onAddToNewCase}
        partitionedFieldMetadata={partitionedFieldMetadata}
        pattern={pattern}
        patternDocsCount={patternDocsCount}
        setSelectedTabId={setSelectedTabId}
        theme={theme}
      />
    ),
    id: SUMMARY_TAB_ID,
    name: i18n.SUMMARY,
  },
  {
    append: (
      <EuiBadge color={getIncompatibleColor()}>
        {partitionedFieldMetadata.incompatible.length}
      </EuiBadge>
    ),
    content: (
      <IncompatibleTab
        addSuccessToast={addSuccessToast}
        addToNewCaseDisabled={addToNewCaseDisabled}
        defaultNumberFormat={defaultNumberFormat}
        docsCount={docsCount}
        ilmPhase={ilmPhase}
        indexName={indexName}
        onAddToNewCase={onAddToNewCase}
        partitionedFieldMetadata={partitionedFieldMetadata}
        patternDocsCount={patternDocsCount}
      />
    ),
    id: INCOMPATIBLE_TAB_ID,
    name: i18n.INCOMPATIBLE_FIELDS,
  },
  {
    append: (
      <EuiBadge color={getCustomColor(partitionedFieldMetadata)}>
        {partitionedFieldMetadata.custom.length}
      </EuiBadge>
    ),
    content: (
      <CustomTab
        addSuccessToast={addSuccessToast}
        defaultNumberFormat={defaultNumberFormat}
        docsCount={docsCount}
        ilmPhase={ilmPhase}
        indexName={indexName}
        partitionedFieldMetadata={partitionedFieldMetadata}
        patternDocsCount={patternDocsCount}
      />
    ),
    id: 'customTab',
    name: i18n.CUSTOM_FIELDS,
  },
  {
    append: (
      <EuiBadge color={getEcsCompliantColor(partitionedFieldMetadata)}>
        {partitionedFieldMetadata.ecsCompliant.length}
      </EuiBadge>
    ),
    content: (
      <EcsCompliantTab
        indexName={indexName}
        onAddToNewCase={onAddToNewCase}
        partitionedFieldMetadata={partitionedFieldMetadata}
      />
    ),
    id: ECS_COMPLIANT_TAB_ID,
    name: i18n.ECS_COMPLIANT_FIELDS,
  },
  {
    append: (
      <EuiBadge color={euiThemeVars.euiColorDarkShade}>
        {partitionedFieldMetadata.all.length}
      </EuiBadge>
    ),
    content: <AllTab indexName={indexName} partitionedFieldMetadata={partitionedFieldMetadata} />,
    id: ALL_TAB_ID,
    name: i18n.ALL_FIELDS,
  },
];
