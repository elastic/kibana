/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { flow } from 'lodash';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import type {
  FieldStatisticsTableEmbeddableState,
  StoredFieldStatisticsTableEmbeddableState,
} from './types';
import { FIELD_STATS_DATA_VIEW_REF_NAME } from './constants';

export function transformOut(
  storedState: StoredFieldStatisticsTableEmbeddableState,
  references?: Reference[]
): FieldStatisticsTableEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredFieldStatisticsTableEmbeddableState>,
    transformTimeRangeOut<StoredFieldStatisticsTableEmbeddableState>
  );
  const state = transformsFlow(storedState);
  const dataViewIdRef = references?.find((ref) => ref.name === FIELD_STATS_DATA_VIEW_REF_NAME);
  return {
    ...state,
    dataViewId: dataViewIdRef?.id ?? '',
  };
}
