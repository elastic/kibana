/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback } from 'react';
import { type AggregateQuery, isOfAggregateQueryType, type Query } from '@kbn/es-query';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import { type ESQLDataGridAttrs } from '../../../app_plugin/shared/edit_on_the_fly/helpers';

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
   * Current attributes of the chart.
   */
  currentAttributes: LensAttributes | undefined;
  /**
   * Function to set errors that occur during initialization.
   */
  setErrors: (errors: Error[]) => void;
  /**
   * Claims the initialization: must be called before the initial run is awaited
   * so that a re-render cannot start a second one while it is still in flight.
   */
  setIsInitialized: (isInitialized: boolean) => void;
  /**
   * Function to run the query and update the chart.
   */
  runQuery: (
    q: AggregateQuery,
    abortController?: AbortController,
    shouldUpdateAttrs?: boolean
  ) => Promise<void>;
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
  currentAttributes,
  runQuery,
  setErrors,
  setIsInitialized,
}: InitializeChartLogicArgs) => {
  return async (abortController?: AbortController) => {
    if (isInitialized) {
      // If already initialized, do nothing
      return;
    }
    // Claimed up front, not once the run below settles: the effect re-runs on
    // every re-render (a chart type switch, a keystroke in the editor) and must
    // not start a second run against the query of that later render.
    setIsInitialized(true);

    if (isTextBasedLanguage && isOfAggregateQueryType(query) && !dataGridAttrs) {
      try {
        const shouldUpdateAttrs = Boolean(currentAttributes?.state.needsRefresh);
        await runQuery(query, abortController, shouldUpdateAttrs);
      } catch (e) {
        setErrors([e]);
      }
    }
  };
};

export function useInitializeChart({
  isTextBasedLanguage,
  query,
  dataGridAttrs,
  isInitialized,
  currentAttributes,
  runQuery,
  setErrors,
  setIsInitialized,
}: InitializeChartLogicArgs) {
  const initializeChartFunc = useCallback(() => {
    const abortController = new AbortController();

    const func = createInitializeChartFunction({
      isTextBasedLanguage,
      query,
      dataGridAttrs,
      isInitialized,
      currentAttributes,
      runQuery,
      setErrors,
      setIsInitialized,
    });
    func(abortController);
  }, [
    isTextBasedLanguage,
    query,
    dataGridAttrs,
    isInitialized,
    currentAttributes,
    runQuery,
    setErrors,
    setIsInitialized,
  ]);
  useEffect(() => {
    initializeChartFunc();
  }, [initializeChartFunc]);
}
