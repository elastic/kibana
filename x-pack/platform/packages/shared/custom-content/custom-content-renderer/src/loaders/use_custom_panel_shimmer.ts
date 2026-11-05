/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';
import { getCustomPanelShimmer, subscribeCustomPanelShimmer } from './custom_panel_shimmer';

/** Whether the custom panel status line plays a shimmer while generating. */
export const useCustomPanelShimmer = (): boolean =>
  useSyncExternalStore(subscribeCustomPanelShimmer, getCustomPanelShimmer, getCustomPanelShimmer);
