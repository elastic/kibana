/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { IS_AGENTLESS_QUERY_PARAM } from '../../common/constants';
import { isAgentlessPoliciesUIEnabled } from '../services';

/**
 * Reads the `isAgentless=true` detect-before-read hint from the current URL. Always false when
 * the agentless policies UI is disabled, so bookmarked/shared links carrying the hint fall back
 * to the legacy package-policy APIs instead of the agentless API.
 */
export const useIsAgentlessQueryParam = (): boolean => {
  const { search } = useLocation();
  return useMemo(
    () =>
      isAgentlessPoliciesUIEnabled() &&
      new URLSearchParams(search).get(IS_AGENTLESS_QUERY_PARAM) === 'true',
    [search]
  );
};
