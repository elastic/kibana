/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import { useMemo } from 'react';
import React, { useState, useEffect, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { buildEmptyFilter, buildEsQuery } from '@kbn/es-query';
import type { FieldValidationResults } from '@kbn/ml-category-validator';

import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { EmbeddablePatternAnalysisInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import { useTableState } from '@kbn/ml-in-memory-table/hooks/use_table_state';
import { AIOPS_ANALYSIS_RUN_ORIGIN, AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import useMountedState from 'react-use/lib/useMountedState';
import { getEsQueryConfig } from '@kbn/data-service';
import { calculateBounds } from '@kbn/data-plugin/common';
import { useFilterQueryUpdates } from '../../../hooks/use_filters_query';
import type { PatternAnalysisProps } from '../../../shared_components/pattern_analysis';
import { useSearch } from '../../../hooks/use_search';
import { getDefaultLogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';
import { useData } from '../../../hooks/use_data';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

import { useCategorizeRequest } from '../use_categorize_request';
import type { EventRate } from '../use_categorize_request';
import { CategoryTable } from '../category_table';
import { LoadingCategorization } from '../loading_categorization';
import { useValidateFieldRequest } from '../use_validate_category_field';
import { useMinimumTimeRange } from './use_minimum_time_range';

import { FieldValidationCallout } from '../category_validation_callout';
import { useActions } from '../category_table/use_actions';
import { InformationText } from '../information_text';

export type LogCategorizationEmbeddableProps = Readonly<
  EmbeddablePatternAnalysisInput & PatternAnalysisProps
>;

const BAR_TARGET = 20;

export const LogCategorizationEmbeddable: FC<LogCategorizationEmbeddableProps> = ({
  dataView,
  savedSearch,
  fieldName,
  minimumTimeRangeOption,
  randomSamplerMode,
  randomSamplerProbability,
  onChange,
  onRenderComplete,
  timeRange,
  lastReloadRequestTime,
}) => {
  const {
    notifications: { toasts },
    data: {
      query: { filterManager },
    },
    uiSettings,
    embeddingOrigin,
  } = useAiopsAppContext();

  const { filters, query } = useFilterQueryUpdates();

  const { runValidateFieldRequest, cancelRequest: cancelValidationRequest } =
    useValidateFieldRequest();
  const { getMinimumTimeRange, cancelRequest: cancelWiderTimeRangeRequest } = useMinimumTimeRange();

  const isMounted = useMountedState();
  const {
    runCategorizeRequest,
    cancelRequest: cancelCategorizationRequest,
    randomSampler,
  } = useCategorizeRequest({
    randomSamplerMode,
    setRandomSamplerMode: () => {},
    randomSamplerProbability,
    setRandomSamplerProbability: () => {},
  });

  const appState = getDefaultLogCategorizationAppState({
    searchQuery: buildEsQuery(
      dataView,
      query ?? [],
      filters ?? [],
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    ),
    filters,
  });
  const { searchQuery } = useSearch({ dataView, savedSearch: savedSearch ?? null }, appState, true);

  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState<boolean | null>(null);
  const [eventRate, setEventRate] = useState<EventRate>([]);
  const [data, setData] = useState<{
    categories: Category[];
    displayExamples: boolean;
    totalCategories: number;
  } | null>(null);
  const [fieldValidationResult, setFieldValidationResult] = useState<FieldValidationResults | null>(
    null
  );
  const tableState = useTableState<Category>([], 'key');

  useEffect(
    function initFields() {
      setLoading(null);
    },
    [dataView]
  );

  const cancelRequest = useCallback(() => {
    cancelWiderTimeRangeRequest();
    cancelValidationRequest();
    cancelCategorizationRequest();
    setLoading(false);
  }, [cancelCategorizationRequest, cancelValidationRequest, cancelWiderTimeRangeRequest]);

  useEffect(
    function cancelRequestOnLeave() {
      return () => {
        cancelRequest();
      };
    },
    [cancelRequest]
  );

  const timeRangeParsed = useMemo(() => {
    if (timeRange) {
      const bounds = calculateBounds(timeRange);
      if (bounds.min && bounds.max) {
        return { min: bounds.min, max: bounds.max };
      }
    }
  }, [timeRange]);

  const { documentStats, timefilter, earliest, latest, intervalMs, forceRefresh } = useData(
    dataView,
    'log_categorization',
    searchQuery,
    () => {},
    undefined,
    undefined,
    BAR_TARGET,
    false,
    timeRangeParsed
  );

  const onAddFilter = useCallback(
    (values: Filter, alias?: string) => {
      const filter = buildEmptyFilter(false, dataView.id);
      if (alias) {
        filter.meta.alias = alias;
      }
      filter.query = values.query;
      filterManager.addFilters([filter]);
    },
    [dataView.id, filterManager]
  );

  const { getActions } = useActions(
    dataView.id!,
    dataView.fields.find((field) => field.name === fieldName),
    selectedCategories,
    appState,
    timefilter,
    onAddFilter,
    undefined
  );

  const loadCategories = useCallback(async () => {
    const { getIndexPattern, timeFieldName: timeField } = dataView;
    const index = getIndexPattern();

    if (
      loading === true ||
      fieldName === null ||
      fieldName === undefined ||
      timeField === undefined ||
      earliest === undefined ||
      latest === undefined ||
      minimumTimeRangeOption === undefined ||
      isMounted() !== true
    ) {
      return;
    }

    cancelRequest();

    setLoading(true);
    setData(null);
    setFieldValidationResult(null);

    const additionalFilter: CategorizationAdditionalFilter = {
      from: earliest,
      to: latest,
    };
    const runtimeMappings = dataView.getRuntimeMappings();

    try {
      const minTimeRange = await getMinimumTimeRange(
        index,
        timeField,
        additionalFilter,
        minimumTimeRangeOption,
        searchQuery,
        runtimeMappings
      );

      if (isMounted() !== true) {
        return;
      }

      const [validationResult, categorizationResult] = await Promise.all([
        runValidateFieldRequest(
          index,
          fieldName,
          timeField,
          minTimeRange,
          searchQuery,
          runtimeMappings,
          {
            [AIOPS_ANALYSIS_RUN_ORIGIN]: embeddingOrigin,
          }
        ),
        runCategorizeRequest(
          index,
          fieldName,
          timeField,
          { to: minTimeRange.to, from: minTimeRange.from },
          searchQuery,
          runtimeMappings,
          intervalMs,
          minTimeRange.useSubAgg ? additionalFilter : undefined
        ),
      ]);

      if (isMounted() !== true) {
        return;
      }

      setFieldValidationResult(validationResult);
      const { categories, hasExamples } = categorizationResult;

      if (minTimeRange.useSubAgg) {
        const categoriesInBucket = categorizationResult.categories
          .map((category) => ({
            ...category,
            count: category.subFieldCount ?? category.subTimeRangeCount!,
            examples: category.subFieldExamples!,
            sparkline: category.subFieldSparkline,
          }))
          .filter((category) => category.count > 0)
          .sort((a, b) => b.count - a.count);
        setData({
          categories: categoriesInBucket,
          displayExamples: hasExamples,
          totalCategories: categories.length,
        });
      } else {
        setData({
          categories,
          displayExamples: hasExamples,
          totalCategories: categories.length,
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toasts.addError(error, {
          title: i18n.translate('xpack.aiops.logCategorization.errorLoadingCategories', {
            defaultMessage: 'Error loading categories',
          }),
        });
      }
    }

    if (isMounted() === true) {
      setLoading(false);
    }
  }, [
    cancelRequest,
    dataView,
    earliest,
    embeddingOrigin,
    fieldName,
    getMinimumTimeRange,
    intervalMs,
    isMounted,
    latest,
    loading,
    minimumTimeRangeOption,
    runCategorizeRequest,
    runValidateFieldRequest,
    searchQuery,
    toasts,
  ]);

  useEffect(
    function setOnChange() {
      if (typeof onChange === 'function') {
        onChange(data?.categories ?? []);
      }
    },
    [data, onChange]
  );

  useEffect(
    function triggerAnalysis() {
      const buckets = documentStats.documentCountStats?.buckets;
      if (buckets === undefined) {
        return;
      }

      randomSampler.setDocCount(documentStats.totalCount);
      setEventRate(
        Object.entries(buckets).map(([key, docCount]) => ({
          key: +key,
          docCount,
        }))
      );

      loadCategories();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      randomSampler,
      documentStats.documentCountStats?.buckets,
      documentStats.totalCount,
      dataView.name,
      fieldName,
      minimumTimeRangeOption,
      randomSamplerMode,
      randomSamplerProbability,
    ]
  );

  useEffect(
    function refreshTriggeredFromButton() {
      if (lastReloadRequestTime !== undefined) {
        cancelRequest();
        forceRefresh();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastReloadRequestTime]
  );

  const isCasesEmbeddable = embeddingOrigin === AIOPS_EMBEDDABLE_ORIGIN.CASES;

  // When in cases, we can only show the "Filter for pattern in Discover" actions as Cases does not have full filter management.
  const actions = isCasesEmbeddable
    ? getActions(true)
    : [...getActions(false), ...getActions(true)];

  return (
    <>
      <FieldValidationCallout validationResults={fieldValidationResult} />
      {(loading ?? true) === true ? (
        <LoadingCategorization {...(!isCasesEmbeddable ? { onCancel: cancelRequest } : {})} />
      ) : null}

      <InformationText
        loading={loading ?? true}
        categoriesLength={data?.categories?.length ?? null}
        eventRateLength={eventRate.length}
      />

      {loading === false && data !== null && data.categories.length > 0 && fieldName !== null ? (
        <CategoryTable
          categories={data.categories}
          eventRate={eventRate}
          enableRowActions={false}
          displayExamples={data.displayExamples}
          setSelectedCategories={setSelectedCategories}
          tableState={tableState}
          selectable={false}
          actions={actions}
          onRenderComplete={onRenderComplete}
        />
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogCategorizationEmbeddable;
