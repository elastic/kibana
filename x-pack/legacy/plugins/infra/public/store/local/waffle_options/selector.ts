/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WaffleOptionsState } from './reducer';

export const selectMetric = (state: WaffleOptionsState) => state.metric;
export const selectGroupBy = (state: WaffleOptionsState) => state.groupBy;
export const selectCustomOptions = (state: WaffleOptionsState) => state.customOptions;
export const selectNodeType = (state: WaffleOptionsState) => state.nodeType;
export const selectView = (state: WaffleOptionsState) => state.view;
export const selectBoundsOverride = (state: WaffleOptionsState) => state.boundsOverride;
export const selectAutoBounds = (state: WaffleOptionsState) => state.autoBounds;
export const selectAccountId = (state: WaffleOptionsState) => state.accountId;
export const selectRegion = (state: WaffleOptionsState) => state.region;
