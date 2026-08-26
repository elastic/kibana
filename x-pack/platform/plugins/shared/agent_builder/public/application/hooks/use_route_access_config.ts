/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RouteAccessConfig } from '../route_config';
import { useFeatureFlags } from './use_feature_flags';
import { useIsUIAMEnabled } from './use_is_uiam_enabled';

export const useRouteAccessConfig = (): RouteAccessConfig => {
  const featureFlags = useFeatureFlags();
  const isUIAMEnabled = useIsUIAMEnabled();

  return useMemo(
    () => ({ featureFlags, capabilities: { isUIAMEnabled } }),
    [featureFlags, isUIAMEnabled]
  );
};
