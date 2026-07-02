/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useContext, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WorkpadRoutingContext } from '../workpad_routing_context';
import { getInFlight } from '../../../state/selectors/resolved_args';
// @ts-expect-error untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
import { refreshWorkpad } from '../../../state/actions/workpad';
import { forceReload } from '../../../components/hooks/use_canvas_api';

const STRUCTURAL_REFRESH_INTERVAL = 60_000;

export const useRefreshHelper = () => {
  const dispatch = useDispatch();
  const { refreshInterval } = useContext(WorkpadRoutingContext);
  const timer = useRef<number | undefined>(undefined);
  const lastStructuralRefresh = useRef<number | null>(null);
  const inFlight = useSelector(getInFlight);

  useEffect(() => {
    // We got here because inFlight or refreshInterval changed.
    // Either way, we want to cancel existing refresh timer
    clearTimeout(timer.current);

    if (refreshInterval > 0 && !inFlight) {
      timer.current = window.setTimeout(() => {
        forceReload();
        const now = Date.now();
        const shouldRefreshStructure =
          lastStructuralRefresh.current === null ||
          now - lastStructuralRefresh.current >= STRUCTURAL_REFRESH_INTERVAL;

        if (shouldRefreshStructure) {
          lastStructuralRefresh.current = now;
          // Reloads the workpad if its source changed, otherwise just re-runs the
          // existing elements.
          dispatch(refreshWorkpad());
        } else {
          dispatch(fetchAllRenderables());
        }
      }, refreshInterval);
    }

    return () => {
      clearTimeout(timer.current);
    };
  }, [inFlight, dispatch, refreshInterval]);
};
