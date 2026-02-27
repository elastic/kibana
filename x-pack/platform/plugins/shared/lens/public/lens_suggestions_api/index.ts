/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ChartType, mapVisToChartType } from '@kbn/visualization-utils';
import { hasTransformationalCommand } from '@kbn/esql-utils';
import type {
  DatasourceMap,
  VisualizationMap,
  VisualizeEditorContext,
  Suggestion,
  DataViewsState,
  TypedLensByValueInput,
} from '@kbn/lens-common';
import { getSuggestions } from '../editor_frame_service/editor_frame/suggestion_helpers';
import { mergeSuggestionWithVisContext, switchVisualizationType } from './helpers';

interface SuggestionsApiProps {
  context: VisualizeFieldContext | VisualizeEditorContext;
  dataView: DataView;
  visualizationMap?: VisualizationMap;
  datasourceMap?: DatasourceMap;
  excludedVisualizations?: string[];
  preferredChartType?: ChartType;
  preferredVisAttributes?: TypedLensByValueInput['attributes'];
}

// Helper function to find compatible suggestion by chart type
const findCompatibleSuggestion = (suggestionCandidates: Suggestion[], targetChartType: ChartType) =>
  suggestionCandidates.find(
    (s) => s.title.includes(targetChartType) || s.visualizationId.includes(targetChartType)
  );

// Helper function to merge suggestion with visual attributes if needed
const createSuggestionWithAttributes = (
  suggestion: Suggestion,
  preferredVisAttributes: TypedLensByValueInput['attributes'] | undefined,
  context: VisualizeFieldContext | VisualizeEditorContext
) =>
  preferredVisAttributes
    ? mergeSuggestionWithVisContext({
        suggestion,
        visAttributes: preferredVisAttributes,
        context,
      })
    : suggestion;

export const suggestionsApi = ({
  context,
  dataView,
  datasourceMap,
  visualizationMap,
  excludedVisualizations,
  preferredChartType,
  preferredVisAttributes,
}: SuggestionsApiProps) => {
  const initialContext = context;
  if (!datasourceMap || !visualizationMap || !dataView.id) return undefined;
  const datasourceStates = {
    formBased: {
      isLoading: false,
      state: {
        layers: {},
      },
    },
    textBased: {
      isLoading: false,
      state: {
        layers: {},
        indexPatternRefs: [],
        initialContext,
      },
    },
  };
  const currentDataViewId = dataView.id;
  const dataViews = {
    indexPatterns: {
      [currentDataViewId]: dataView,
    },
    indexPatternRefs: [],
  } as unknown as DataViewsState;

  const initialVisualization = visualizationMap?.[Object.keys(visualizationMap)[0]] || null;
  const isInitialSubTypeSupported = preferredChartType
    ? initialVisualization?.isSubtypeSupported?.(preferredChartType.toLowerCase())
    : undefined;

  const query = 'query' in context ? context.query : undefined;

  // find the active visualizations from the context
  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualization: initialVisualization,
    visualizationState: undefined,
    visualizeTriggerFieldContext: context,
    subVisualizationId: isInitialSubTypeSupported ? preferredChartType?.toLowerCase() : undefined,
    dataViews,
    query,
  });
  if (!suggestions.length) return [];

  const primarySuggestion = suggestions[0];
  const activeVisualization = visualizationMap[primarySuggestion.visualizationId];
  if (
    primarySuggestion.incomplete ||
    excludedVisualizations?.includes(primarySuggestion.visualizationId)
  ) {
    return [];
  }
  // compute the rest suggestions depending on the active one and filter out the lnsLegacyMetric
  const newSuggestions = getSuggestions({
    datasourceMap,
    datasourceStates: {
      textBased: {
        isLoading: false,
        state: primarySuggestion.datasourceState,
      },
    },
    visualizationMap,
    activeVisualization,
    visualizationState: primarySuggestion.visualizationState,
    dataViews,
    query,
  }).filter(
    (sug) =>
      // Datatables are always return as hidden suggestions
      // if the user has requested for a datatable (preferredChartType), we want to return it
      // although it is a hidden suggestion
      (sug.hide && sug.visualizationId === 'lnsDatatable') ||
      // Filter out suggestions that are hidden and legacy metrics
      (!sug.hide && sug.visualizationId !== 'lnsLegacyMetric')
  );

  const chartType = preferredChartType?.toLowerCase();

  const xyResult = switchVisualizationType({
    visualizationMap,
    suggestions: newSuggestions,
    targetTypeId: chartType,
    familyType: 'lnsXY',
    forceSwitch: ['area', 'line'].some((type) => chartType?.includes(type)),
  });
  if (xyResult) return xyResult;

  // to return a donut instead of a pie chart
  const pieResult = switchVisualizationType({
    visualizationMap,
    suggestions: newSuggestions,
    targetTypeId: chartType,
    familyType: 'lnsPie',
    forceSwitch: preferredChartType === ChartType.Donut,
  });
  if (pieResult) return pieResult;

  const chartTypeFromAttrs = preferredVisAttributes
    ? mapVisToChartType(preferredVisAttributes.visualizationType)
    : undefined;

  const targetChartType = preferredChartType ?? chartTypeFromAttrs;

  // However, for ESQL queries without transformational commands, prefer datatable
  const hasTransformations = query ? hasTransformationalCommand(query.esql) : true;

  // in case the user asks for another type (except from area, line) check if it exists
  // in suggestions and return this instead
  const suggestionsList = [primarySuggestion, ...newSuggestions]
    .filter((s) => {
      // if we only have non-transformed ESQL, suggest only table
      if (!hasTransformations) {
        return s.visualizationId === 'lnsDatatable';
      }
      return true;
    })
    .sort((a, b) => {
      // If has transformations, prioritize lnsXY
      if (a.visualizationId === 'lnsXY' && b.visualizationId !== 'lnsXY') return -1;
      if (a.visualizationId !== 'lnsXY' && b.visualizationId === 'lnsXY') return 1;
      // Both are same type, sort by score
      return b.score - a.score;
    });

  // Handle preferred chart type logic
  if (targetChartType) {
    // Special case for table when user hasn't changed chart type and there's only one suggestion
    if (
      !preferredChartType &&
      suggestionsList.length === 1 &&
      targetChartType === ChartType.Table
    ) {
      const suggestion = createSuggestionWithAttributes(
        suggestionsList[0],
        preferredVisAttributes,
        context
      );
      return [suggestion];
    }

    // General case: find compatible suggestion for preferred chart type
    // Skip if user hasn't changed chart type, has multiple suggestions, and wants table
    const shouldSkipSearch =
      !preferredChartType && suggestionsList.length > 1 && targetChartType === ChartType.Table;
    if (!shouldSkipSearch) {
      const compatibleSuggestion = findCompatibleSuggestion(suggestionsList, targetChartType);
      const selectedSuggestion = compatibleSuggestion ?? suggestionsList[0];

      return [createSuggestionWithAttributes(selectedSuggestion, preferredVisAttributes, context)];
    }
  }

  return suggestionsList;
};
