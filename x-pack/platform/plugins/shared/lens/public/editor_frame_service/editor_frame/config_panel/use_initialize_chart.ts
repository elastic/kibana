/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import { AggregateQuery, isOfAggregateQueryType, Query } from '@kbn/es-query';
import { MutableRefObject } from 'react';
import { type ESQLDataGridAttrs } from '../../../app_plugin/shared/edit_on_the_fly/helpers';
import { TypedLensSerializedState } from '../../../react_embeddable/types';

interface InitializeChartLogicArgs {
  isTextBasedLanguage: boolean;
  query: AggregateQuery | Query;
  dataGridAttrs: ESQLDataGridAttrs | undefined;
  currentErrors: Error[];
  runQuery: (
    q: AggregateQuery,
    abortController?: AbortController,
    shouldUpdateAttrs?: boolean
  ) => Promise<void>;
  attributes: TypedLensSerializedState['attributes'] | undefined;
  prevQueryRef: MutableRefObject<AggregateQuery | Query>;
  setErrors: (errors: Error[]) => void;
}

/**
 * Encapsulates the logic for initializing the chart/data grid based on ESQL query.
 * Returns a function that can be called within useEffect.
 */
export const createInitializeChartFunction = ({
  isTextBasedLanguage,
  query,
  dataGridAttrs,
  currentErrors,
  runQuery,
  attributes,
  prevQueryRef,
  setErrors,
}: InitializeChartLogicArgs) => {
  return async (abortController?: AbortController) => {
    if (
      isTextBasedLanguage &&
      isOfAggregateQueryType(query) &&
      !dataGridAttrs &&
      currentErrors.length === 0 // Using currentErrors here
    ) {
      try {
        await runQuery(query, abortController, Boolean(attributes?.state.needsRefresh));
      } catch (e) {
        setErrors([e]);
        prevQueryRef.current = query;
      }
    }
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
