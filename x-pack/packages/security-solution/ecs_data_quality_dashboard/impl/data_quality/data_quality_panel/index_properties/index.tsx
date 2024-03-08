/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat, EcsVersion } from '@elastic/ecs';
import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartialTheme,
  PartitionElementEvent,
  Theme,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { getUnallowedValueRequestItems } from '../allowed_values/helpers';
import { ErrorEmptyPrompt } from '../error_empty_prompt';
import {
  EMPTY_METADATA,
  getMappingsProperties,
  getSortedPartitionedFieldMetadata,
  hasAllDataFetchingCompleted,
  INCOMPATIBLE_TAB_ID,
} from './helpers';
import { LoadingEmptyPrompt } from '../loading_empty_prompt';
import { getIndexPropertiesContainerId } from '../pattern/helpers';
import { getTabs } from '../tabs/helpers';
import {
  getAllIncompatibleMarkdownComments,
  getIncompatibleValuesFields,
  getIncompatibleMappingsFields,
  getSameFamilyFields,
} from '../tabs/incompatible_tab/helpers';
import * as i18n from './translations';
import type { EcsMetadata, IlmPhase, PartitionedFieldMetadata, PatternRollup } from '../../types';
import { useAddToNewCase } from '../../use_add_to_new_case';
import { useMappings } from '../../use_mappings';
import { useUnallowedValues } from '../../use_unallowed_values';
import { useDataQualityContext } from '../data_quality_context';
import { formatStorageResult, postStorageResult, getSizeInBytes } from '../../helpers';

const EMPTY_MARKDOWN_COMMENTS: string[] = [];

export interface Props {
  addSuccessToast: (toast: { title: string }) => void;
  canUserCreateAndReadCases: () => boolean;
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
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
  indexId: string | null | undefined;
  indexName: string;
  isAssistantEnabled: boolean;
  openCreateCaseFlyout: ({
    comments,
    headerContent,
  }: {
    comments: string[];
    headerContent?: React.ReactNode;
  }) => void;
  pattern: string;
  patternRollup: PatternRollup | undefined;
  theme?: PartialTheme;
  baseTheme: Theme;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}

const IndexPropertiesComponent: React.FC<Props> = ({
  addSuccessToast,
  baseTheme,
  canUserCreateAndReadCases,
  docsCount,
  formatBytes,
  formatNumber,
  getGroupByFieldsOnClick,
  ilmPhase,
  indexId,
  indexName,
  isAssistantEnabled,
  openCreateCaseFlyout,
  pattern,
  patternRollup,
  theme,
  updatePatternRollup,
}) => {
  const { error: mappingsError, indexes, loading: loadingMappings } = useMappings(indexName);
  const { telemetryEvents, isILMAvailable, httpFetch, toasts } = useDataQualityContext();

  const requestItems = useMemo(
    () =>
      getUnallowedValueRequestItems({
        ecsMetadata: EcsFlat as unknown as Record<string, EcsMetadata>,
        indexName,
      }),
    [indexName]
  );

  const {
    error: unallowedValuesError,
    loading: loadingUnallowedValues,
    unallowedValues,
    requestTime,
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
        formatBytes,
        formatNumber,
        docsCount,
        getGroupByFieldsOnClick,
        ilmPhase,
        isAssistantEnabled,
        indexName,
        onAddToNewCase,
        partitionedFieldMetadata: partitionedFieldMetadata ?? EMPTY_METADATA,
        pattern,
        patternDocsCount: patternRollup?.docsCount ?? 0,
        setSelectedTabId,
        stats: patternRollup?.stats ?? null,
        theme,
        baseTheme,
      }),
    [
      addSuccessToast,
      addToNewCaseDisabled,
      docsCount,
      formatBytes,
      formatNumber,
      getGroupByFieldsOnClick,
      ilmPhase,
      indexName,
      isAssistantEnabled,
      onAddToNewCase,
      partitionedFieldMetadata,
      pattern,
      patternRollup?.docsCount,
      patternRollup?.stats,
      theme,
      baseTheme,
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

      const indexSameFamily: number | undefined =
        error == null && partitionedFieldMetadata != null
          ? partitionedFieldMetadata.sameFamily.length
          : undefined;

      if (patternRollup != null) {
        const markdownComments =
          partitionedFieldMetadata != null
            ? getAllIncompatibleMarkdownComments({
                docsCount,
                formatBytes,
                formatNumber,
                ilmPhase,
                indexName,
                isILMAvailable,
                partitionedFieldMetadata,
                patternDocsCount: patternRollup.docsCount ?? 0,
                sizeInBytes: patternRollup.sizeInBytes,
              })
            : EMPTY_MARKDOWN_COMMENTS;

        const checkedAt = partitionedFieldMetadata ? Date.now() : undefined;

        const updatedRollup = {
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
              sameFamily: indexSameFamily,
              checkedAt,
            },
          },
        };
        updatePatternRollup(updatedRollup);

        if (indexId && requestTime != null && requestTime > 0 && partitionedFieldMetadata) {
          const report = {
            batchId: uuidv4(),
            ecsVersion: EcsVersion,
            errorCount: error ? 1 : 0,
            ilmPhase,
            indexId,
            indexName,
            isCheckAll: false,
            numberOfDocuments: docsCount,
            numberOfFields: partitionedFieldMetadata.all.length,
            numberOfIncompatibleFields: indexIncompatible,
            numberOfEcsFields: partitionedFieldMetadata.ecsCompliant.length,
            numberOfCustomFields: partitionedFieldMetadata.custom.length,
            numberOfIndices: 1,
            numberOfIndicesChecked: 1,
            numberOfSameFamily: indexSameFamily,
            sizeInBytes: getSizeInBytes({ stats: patternRollup.stats, indexName }),
            timeConsumedMs: requestTime,
            sameFamilyFields: getSameFamilyFields(partitionedFieldMetadata.sameFamily),
            unallowedMappingFields: getIncompatibleMappingsFields(
              partitionedFieldMetadata.incompatible
            ),
            unallowedValueFields: getIncompatibleValuesFields(
              partitionedFieldMetadata.incompatible
            ),
          };
          telemetryEvents.reportDataQualityIndexChecked?.(report);

          const result = updatedRollup.results[indexName];
          if (result) {
            const storageResult = formatStorageResult({ result, report, partitionedFieldMetadata });
            postStorageResult({ storageResult, httpFetch, toasts });
          }
        }
      }
    }
  }, [
    docsCount,
    formatBytes,
    formatNumber,
    httpFetch,
    ilmPhase,
    indexId,
    indexName,
    isILMAvailable,
    loadingMappings,
    loadingUnallowedValues,
    mappingsError,
    partitionedFieldMetadata,
    pattern,
    patternRollup,
    requestTime,
    telemetryEvents,
    toasts,
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
    <div data-index-properties-container={getIndexPropertiesContainerId({ indexName, pattern })}>
      <EuiTabs>{renderTabs()}</EuiTabs>
      {selectedTabContent}
    </div>
  ) : null;
};
IndexPropertiesComponent.displayName = 'IndexPropertiesComponent';

export const IndexProperties = React.memo(IndexPropertiesComponent);
