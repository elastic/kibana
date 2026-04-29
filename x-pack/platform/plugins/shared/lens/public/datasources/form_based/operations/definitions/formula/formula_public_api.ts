/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { FormulaPublicApi, IndexPattern } from '@kbn/lens-common';
import { convertDataViewIntoLensIndexPattern } from '../../../../../data_views_service/loader';

import { insertOrReplaceFormulaColumn } from './parse';

/** @public **/
export const createFormulaPublicApi = (): FormulaPublicApi => {
  const cache: WeakMap<DataView, IndexPattern> = new WeakMap();

  const getCachedLensIndexPattern = (dataView: DataView): IndexPattern => {
    const cachedIndexPattern = cache.get(dataView);
    if (cachedIndexPattern) {
      return cachedIndexPattern;
    }
    const indexPattern = convertDataViewIntoLensIndexPattern(dataView);
    cache.set(dataView, indexPattern);
    return indexPattern;
  };

  return {
    insertOrReplaceFormulaColumn: (
      id,
      { formula, label, format, filter, reducedTimeRange, timeScale },
      layer,
      dataView,
      dateRange
    ) => {
      const indexPattern = getCachedLensIndexPattern(dataView);

      return insertOrReplaceFormulaColumn(
        id,
        {
          label: label ?? formula,
          customLabel: Boolean(label),
          operationType: 'formula',
          dataType: 'number',
          references: [],
          isBucketed: false,
          filter,
          reducedTimeRange,
          timeScale,
          params: {
            formula,
            format,
          },
        },
        { ...layer, indexPatternId: indexPattern.id },
        { indexPattern, dateRange }
      ).layer;
    },
  };
};
