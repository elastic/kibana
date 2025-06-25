/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, type MutableRefObject } from 'react';
import { type AggregateQuery, isOfAggregateQueryType, type Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  type ESQLDataGridAttrs,
  getSuggestions,
} from '../../../app_plugin/shared/edit_on_the_fly/helpers';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { TypedLensSerializedState } from '../../../react_embeddable/types';

type LensAttributes = TypedLensSerializedState['attributes'];

export interface InitializeChartLogicArgs {
  /**
   * Indicates if the query is in text-based language (ESQL).
   */
  isTextBasedLanguage: boolean;
  /**
   * The query to be executed.
   */
  query: AggregateQuery | Query;
  /**
   * Attributes for the ESQL data grid, if applicable.
   */
  dataGridAttrs: ESQLDataGridAttrs | undefined;
  /**
   * Indicates if the dataGridAttrs havw been initialized.
   */
  isInitialized: boolean;
  /**
   * The data service to be used for fetching data.
   */
  data: DataPublicPluginStart;
  /**
   * Map of datasources available.
   */
  datasourceMap: DatasourceMap;
  /**
   * Map of visualizations available.
   */
  visualizationMap: VisualizationMap;
  /**
   * Ad-hoc data views that can be used for the query.
   */
  adHocDataViews: DataViewSpec[];
  /**
   * Current attributes of the chart.
   */
  currentAttributes: LensAttributes | undefined;
  /**
   * Callback to be executed on successful data retrieval.
   */
  successCallback: (attrs: LensAttributes) => void;
  /**
   * Reference to the previous query.
   */
  prevQueryRef: MutableRefObject<AggregateQuery | Query>;
  /**
   * Function to set errors that occur during initialization.
   */
  setErrors: (errors: Error[]) => void;
  /**
   * Function to set the initialization state.
   */
  setIsInitialized: (isInitialized: boolean) => void;
  /**
   * Function to set the data grid attributes.
   */
  setDataGridAttrs?: (attrs: ESQLDataGridAttrs) => void;
  /**
   * ESQL control variables to be used in the query.
   */
  esqlVariables?: ESQLControlVariable[];
}

/**
 * Encapsulates the logic for initializing the chart/data grid based on ESQL query.
 *
 */
export const createInitializeChartFunction = ({
  isTextBasedLanguage,
  query,
  dataGridAttrs,
  isInitialized,
  data,
  datasourceMap,
  visualizationMap,
  adHocDataViews,
  setDataGridAttrs,
  esqlVariables,
  currentAttributes,
  successCallback,
  prevQueryRef,
  setErrors,
  setIsInitialized,
}: InitializeChartLogicArgs) => {
  return async (abortController?: AbortController) => {
    if (isInitialized) {
      // If already initialized, do nothing
      return;
    }
    if (isTextBasedLanguage && isOfAggregateQueryType(query) && !dataGridAttrs) {
      try {
        const shouldUpdateAttrs = Boolean(currentAttributes?.state.needsRefresh);
        const attrs = await getSuggestions(
          query,
          data,
          datasourceMap,
          visualizationMap,
          adHocDataViews,
          setErrors,
          abortController,
          setDataGridAttrs,
          esqlVariables,
          shouldUpdateAttrs,
          currentAttributes
        );

        if (attrs) {
          successCallback(attrs);
          setErrors([]);
        }
      } catch (e) {
        setErrors([e]);
      }
      prevQueryRef.current = query;
    }
    setIsInitialized(true);
  };
};

export function useInitializeChart(args: InitializeChartLogicArgs) {
  useEffect(() => {
    const abortController = new AbortController();
    const initializeChartFunc = createInitializeChartFunction({
      ...args,
    });

    initializeChartFunc(abortController);
  }, [args]);
}
