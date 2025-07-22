/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useCallback, type MutableRefObject } from 'react';
import { type AggregateQuery, isOfAggregateQueryType, type Query } from '@kbn/es-query';
import { type ESQLDataGridAttrs } from '../../../app_plugin/shared/edit_on_the_fly/helpers';
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
   * Current attributes of the chart.
   */
  currentAttributes: LensAttributes | undefined;
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
        await runQuery(query, abortController, shouldUpdateAttrs);
      } catch (e) {
        setErrors([e]);
      }
      prevQueryRef.current = query;
    }
    setIsInitialized(true);
  };
};

export function useInitializeChart({
  isTextBasedLanguage,
  query,
  dataGridAttrs,
  isInitialized,
  currentAttributes,
  runQuery,
  prevQueryRef,
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
      prevQueryRef,
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
    prevQueryRef,
    setErrors,
    setIsInitialized,
  ]);
  useEffect(() => {
    initializeChartFunc();
  }, [initializeChartFunc]);
}
