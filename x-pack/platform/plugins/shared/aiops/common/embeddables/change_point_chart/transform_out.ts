/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import { CHANGE_POINT_CHART_DATA_VIEW_REF_NAME } from '@kbn/aiops-change-point-detection/constants';
import { flow } from 'lodash';
import type { ChangePointEmbeddableState, StoredChangePointEmbeddableState } from './types';

export function transformOut(
  storedState: StoredChangePointEmbeddableState,
  references?: Reference[]
): ChangePointEmbeddableState {
  const transformsFlow = flow(
    transformTitlesOut<StoredChangePointEmbeddableState>,
    transformTimeRangeOut<StoredChangePointEmbeddableState>
  );
  const state = transformsFlow(storedState);
  const dataViewIdRef = references?.find(
    (ref) => ref.name === CHANGE_POINT_CHART_DATA_VIEW_REF_NAME
  );
  return {
    ...state,
    dataViewId: dataViewIdRef?.id ?? '',
  };
}
