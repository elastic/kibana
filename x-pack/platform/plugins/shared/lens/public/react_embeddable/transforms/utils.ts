/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LensSerializedState,
  LensByRefSerializedAPIConfig,
  LensSerializedAPIConfig,
  LensByRefSerializedState,
} from '../types';

export function isByRefLensState(state: LensSerializedState): state is LensByRefSerializedState {
  return !state.attributes;
}

export function isByRefLensConfig(
  config: LensSerializedAPIConfig
): config is LensByRefSerializedAPIConfig {
  return !config.attributes;
}
