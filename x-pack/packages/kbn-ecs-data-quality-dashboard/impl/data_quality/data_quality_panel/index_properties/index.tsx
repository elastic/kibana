/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@kbn/ecs';
import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getUnallowedValueRequestItems } from '../allowed_values/helpers';
import { ErrorEmptyPrompt } from '../error_empty_prompt';
import {
  EMPTY_METADATA,
  getMappingsProperties,
  getSortedPartitionedFieldMetadata,
  hasAllDataFetchingCompleted,
  INCOMPATIBLE_TAB_ID,
} from './helpers';
import { EMPTY_STAT } from '../../helpers';
import { LoadingEmptyPrompt } from '../loading_empty_prompt';
import { getTabs } from '../tabs/helpers';
import { getAllIncompatibleMarkdownComments } from '../tabs/incompatible_tab/helpers';
import * as i18n from './translations';
import type { EcsMetadata, IlmPhase, PartitionedFieldMetadata, PatternRollup } from '../../types';
import { useAddToNewCase } from '../../use_add_to_new_case';
import { useMappings } from '../../use_mappings';
import { useUnallowedValues } from '../../use_unallowed_values';

const EMPTY_MARKDOWN_COMMENTS: string[] = [];

interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
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
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  theme: Theme;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}

const IndexPropertiesComponent: React.FC<Props> = ({
  addSuccessToast,
  canUserCreateAndReadCases,
  defaultNumberFormat,
  docsCount,
  getGroupByFieldsOnClick,
  ilmPhase,
  indexName,
  openCreateCaseFlyout,
  pattern,
  patternRollup,
  theme,
  updatePatternRollup,
}) => {
  const formatNumber = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT,
    [defaultNumberFormat]
  );
  const { error: mappingsError, indexes, loading: loadingMappings } = useMappings(indexName);

  const requestItems = useMemo(
    () =>
      getUnallowedValueRequestItems({
        indexName,
      }),
    [indexName]
  );

  const {
    error: unallowedValuesError,
    loading: loadingUnallowedValues,
    unallowedValues,
  } = useUnallowedValues({ indexName, requestItems });

  const mappingsProperties = useMemo(
    () =>
      getMappingsProperties({
        indexes,
        indexName,
      }),
    [indexName, indexes]
  );

  const partitionedFieldMetadata: PartitionedFieldMetadata | null = useMemo(
    () =>
      getSortedPartitionedFieldMetadata({
        ecsMetadata: EcsFlat as unknown as Record<string, EcsMetadata>,
        loadingMappings,
        mappingsProperties,
        unallowedValues,
      }),
    [loadingMappings, mappingsProperties, unallowedValues]
  );

  const { disabled: addToNewCaseDisabled, onAddToNewCase } = useAddToNewCase({
    canUserCreateAndReadCases,
    indexName,
    openCreateCaseFlyout,
  });

  const [selectedTabId, setSelectedTabId] = useState<string>(INCOMPATIBLE_TAB_ID);

  const tabs = useMemo(
    () =>
      getTabs({
        addSuccessToast,
        addToNewCaseDisabled,
        defaultNumberFormat,
        docsCount,
        getGroupByFieldsOnClick,
        ilmPhase,
        indexName,
        onAddToNewCase,
        partitionedFieldMetadata: partitionedFieldMetadata ?? EMPTY_METADATA,
        pattern,
        patternDocsCount: patternRollup?.docsCount ?? 0,
        setSelectedTabId,
        theme,
      }),
    [
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
      patternRollup?.docsCount,
      theme,
    ]
  );

  const onSelectedTabChanged = useCallback((id: string) => {
    setSelectedTabId(id);
  }, []);

  const selectedTabContent = useMemo(
    () => (
      <>
        <EuiSpacer />
        {tabs.find((obj) => obj.id === selectedTabId)?.content}
      </>
    ),
    [selectedTabId, tabs]
  );

  const renderTabs = useCallback(
    () =>
      tabs.map((tab, index) => (
        <EuiTab
          append={tab.append}
          isSelected={tab.id === selectedTabId}
          key={index}
          onClick={() => onSelectedTabChanged(tab.id)}
        >
          {tab.name}
        </EuiTab>
      )),
    [onSelectedTabChanged, selectedTabId, tabs]
  );

  useEffect(() => {
    if (hasAllDataFetchingCompleted({ loadingMappings, loadingUnallowedValues })) {
      const error: string | null = mappingsError ?? unallowedValuesError;
      const indexIncompatible: number | undefined =
        error == null && partitionedFieldMetadata != null
          ? partitionedFieldMetadata.incompatible.length
          : undefined;

      if (patternRollup != null) {
        const markdownComments =
          partitionedFieldMetadata != null
            ? getAllIncompatibleMarkdownComments({
                docsCount,
                formatNumber,
                ilmPhase,
                indexName,
                partitionedFieldMetadata,
                patternDocsCount: patternRollup.docsCount ?? 0,
              })
            : EMPTY_MARKDOWN_COMMENTS;

        updatePatternRollup({
          ...patternRollup,
          results: {
            ...patternRollup.results,
            [indexName]: {
              docsCount,
              error,
              ilmPhase,
              incompatible: indexIncompatible,
              indexName,
              markdownComments,
              pattern,
            },
          },
        });
      }
    }
  }, [
    docsCount,
    formatNumber,
    ilmPhase,
    indexName,
    loadingMappings,
    loadingUnallowedValues,
    mappingsError,
    partitionedFieldMetadata,
    pattern,
    patternRollup,
    unallowedValuesError,
    updatePatternRollup,
  ]);

  if (mappingsError != null) {
    return <ErrorEmptyPrompt title={i18n.ERROR_LOADING_MAPPINGS_TITLE} />;
  } else if (unallowedValuesError != null) {
    return <ErrorEmptyPrompt title={i18n.ERROR_LOADING_UNALLOWED_VALUES_TITLE} />;
  }

  if (loadingMappings) {
    return <LoadingEmptyPrompt loading={i18n.LOADING_MAPPINGS} />;
  } else if (loadingUnallowedValues) {
    return <LoadingEmptyPrompt loading={i18n.LOADING_UNALLOWED_VALUES} />;
  }

  return indexes != null ? (
    <>
      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </>
  ) : null;
};
IndexPropertiesComponent.displayName = 'IndexPropertiesComponent';

export const IndexProperties = React.memo(IndexPropertiesComponent);
