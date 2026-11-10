/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { CANVAS_URL_STATE_KEY } from '../../../../../common/url_schema';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useUnitId } from '../../../../hooks/use_unit_id';
import { streamsAppRouter } from '../../../../routes/config';
import { defaultCanvasUrlState } from './state_management';

interface CanvasSearchPathParams {
  unitId: string;
  rangeFrom: string;
  rangeTo: string;
}

export const getCanvasSearchPath = (
  query: string,
  { unitId, rangeFrom, rangeTo }: CanvasSearchPathParams
): string =>
  setStateToKbnUrl(
    CANVAS_URL_STATE_KEY,
    { ...defaultCanvasUrlState, query },
    { useHash: false, storeInHashQuery: false },
    streamsAppRouter.link('/v2/unit/{unitId}/{tab}', {
      path: { unitId, tab: 'map' },
      query: { rangeFrom, rangeTo },
    })
  );

export const useNavigateToCanvasSearch = (): ((query: string) => void) => {
  const history = useHistory();
  const { rangeFrom, rangeTo } = useTimeRange();
  const unitId = useUnitId();

  return useCallback(
    (query: string) => {
      history.push(getCanvasSearchPath(query, { unitId, rangeFrom, rangeTo }));
    },
    [history, unitId, rangeFrom, rangeTo]
  );
};
