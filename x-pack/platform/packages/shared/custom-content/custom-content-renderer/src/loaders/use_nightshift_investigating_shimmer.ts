/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import {
  getNightshiftInvestigatingShimmer,
  subscribeNightshiftInvestigatingShimmer,
} from './nightshift_investigating_shimmer';

/** Whether the Nightshift in-progress status plays a shimmer. */
export const useNightshiftInvestigatingShimmer = (): boolean =>
  useSyncExternalStore(
    subscribeNightshiftInvestigatingShimmer,
    getNightshiftInvestigatingShimmer,
    getNightshiftInvestigatingShimmer
  );
