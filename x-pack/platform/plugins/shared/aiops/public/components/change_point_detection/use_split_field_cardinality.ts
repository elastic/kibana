/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type {
  QueryDslQueryContainer,
  AggregationsCardinalityAggregate,
  SearchResponseBody,
} from '@elastic/elasticsearch/lib/api/types';
import usePrevious from 'react-use/lib/usePrevious';
import { useChangePointDetectionControlsContext } from './change_point_detection_context';
import { useCancellableSearch } from '../../hooks/use_cancellable_search';
import { useDataSource } from '../../hooks/use_data_source';

/**
 * Gets the cardinality of the selected split field
 * @param splitField
 * @param query
 */
export function useSplitFieldCardinality(
  splitField: string | undefined,
  query: QueryDslQueryContainer
) {
  const prevSplitField = usePrevious(splitField);
  const { splitFieldsOptions } = useChangePointDetectionControlsContext();

  const [cardinality, setCardinality] = useState<number | null>(null);
  const { dataView } = useDataSource();

  const requestPayload = useMemo(() => {
    const optionDefinition = splitFieldsOptions.find((option) => option.name === splitField);
    let runtimeMappings = {};
    if (optionDefinition?.isRuntimeField) {
      runtimeMappings = {
        runtime_mappings: { [optionDefinition.name]: optionDefinition.runtimeField },
      };
    }
    return {
      params: {
        index: dataView.getIndexPattern(),
        size: 0,
        body: {
          query,
          aggregations: {
            fieldCount: {
              cardinality: {
                field: splitField,
              },
            },
          },
          ...runtimeMappings,
        },
      },
    };
  }, [splitField, dataView, query, splitFieldsOptions]);

  const { runRequest: getSplitFieldCardinality, cancelRequest } = useCancellableSearch();

  useEffect(
    function performCardinalityCheck() {
      setCardinality(null);
      if (splitField === undefined) {
        return;
      }

      cancelRequest();

      getSplitFieldCardinality<
        typeof requestPayload,
        {
          rawResponse: SearchResponseBody<
            unknown,
            { fieldCount: AggregationsCardinalityAggregate }
          >;
        }
      >(requestPayload).then((response) => {
        if (response?.rawResponse.aggregations) {
          setCardinality(response.rawResponse.aggregations.fieldCount.value);
        }
      });
    },
    [getSplitFieldCardinality, requestPayload, cancelRequest, splitField]
  );

  return prevSplitField !== splitField ? null : cardinality;
}
