/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';

import type { AnyIntraAppRouteState } from '../types';

/**
 * Retrieve UI Route state from the React Router History for the current URL location.
 * This state can be used by other Kibana Apps to influence certain behaviours in Ingest, for example,
 * redirecting back to an given Application after a craete action.
 */
export function useIntraAppState<S = AnyIntraAppRouteState>(): S | undefined {
  const location = useLocation();

  return location.state as S;
}
