/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { ChartType, mapVisToChartType } from '@kbn/visualization-utils';
import { getSuggestions } from '../editor_frame_service/editor_frame/suggestion_helpers';
import type { DatasourceMap, VisualizationMap, VisualizeEditorContext, Suggestion } from '../types';
import type { DataViewsState } from '../state_management';
import type { TypedLensByValueInput } from '../react_embeddable/types';
import { mergeSuggestionWithVisContext } from './helpers';

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

  // find the active visualizations from the context
  const suggestions = getSuggestions({
    datasourceMap,
    datasourceStates,
    visualizationMap,
    activeVisualization: initialVisualization,
    visualizationState: undefined,
    visualizeTriggerFieldContext: context,
    dataViews,
  });
  if (!suggestions.length) return [];

  const activeVisualization = suggestions[0];
  if (
    activeVisualization.incomplete ||
    excludedVisualizations?.includes(activeVisualization.visualizationId)
  ) {
    return [];
  }
  // compute the rest suggestions depending on the active one and filter out the lnsLegacyMetric
  const newSuggestions = getSuggestions({
    datasourceMap,
    datasourceStates: {
      textBased: {
        isLoading: false,
        state: activeVisualization.datasourceState,
      },
    },
    visualizationMap,
    activeVisualization: visualizationMap[activeVisualization.visualizationId],
    visualizationState: activeVisualization.visualizationState,
    dataViews,
  }).filter(
    (sug) =>
      // Datatables are always return as hidden suggestions
      // if the user has requested for a datatable (preferredChartType), we want to return it
      // although it is a hidden suggestion
      (sug.hide && sug.visualizationId === 'lnsDatatable') ||
      // Filter out suggestions that are hidden and legacy metrics
      (!sug.hide && sug.visualizationId !== 'lnsLegacyMetric')
  );

  // check if there is an XY chart suggested
  // if user has requested for a line or area, we want to sligthly change the state
  // to return line / area instead of a bar chart
  const chartType = preferredChartType?.toLowerCase();
  const XYSuggestion = newSuggestions.find((s) => s.visualizationId === 'lnsXY');
  // a type can be area, line, area_stacked, area_percentage etc
  const isAreaOrLine = ['area', 'line'].some((type) => chartType?.includes(type));
  if (XYSuggestion && chartType && isAreaOrLine) {
    const visualizationState = visualizationMap[
      XYSuggestion.visualizationId
    ]?.switchVisualizationType?.(chartType, XYSuggestion?.visualizationState);

    return [
      {
        ...XYSuggestion,
        visualizationState,
      },
    ];
  }

  const chartTypeFromAttrs = preferredVisAttributes
    ? mapVisToChartType(preferredVisAttributes.visualizationType)
    : undefined;

  const targetChartType = preferredChartType ?? chartTypeFromAttrs;

  // in case the user asks for another type (except from area, line) check if it exists
  // in suggestions and return this instead
  const suggestionsList = [activeVisualization, ...newSuggestions];

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

  // if there is no preference from the user, send everything
  // until we separate the text based suggestions logic from the dataview one,
  // we want to sort XY first
  const sortXYFirst = suggestionsList.sort((a, b) => (a.visualizationId === 'lnsXY' ? -1 : 1));
  return sortXYFirst;
};
