/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import {
  getNightshiftInvestigatingPreview,
  subscribeNightshiftInvestigatingPreview,
} from './nightshift_investigating_preview';

/** Whether the Nightshift home is showing its investigating state on demand. */
export const useNightshiftInvestigatingPreview = (): boolean =>
  useSyncExternalStore(
    subscribeNightshiftInvestigatingPreview,
    getNightshiftInvestigatingPreview,
    getNightshiftInvestigatingPreview
  );
