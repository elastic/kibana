/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EffectiveFailureStore, FailureStore } from '@kbn/streams-schema';
import { isEnabledFailureStore, isEnabledLifecycleFailureStore } from '@kbn/streams-schema';

// Importing always persists an explicit value, never `inherit`.
export const getImportedFailureStore = (
  effectiveFailureStore: EffectiveFailureStore
): FailureStore => {
  if (!isEnabledFailureStore(effectiveFailureStore)) {
    return { disabled: {} };
  }

  if (!isEnabledLifecycleFailureStore(effectiveFailureStore)) {
    return { lifecycle: { disabled: {} } };
  }

  const { data_retention: dataRetention } = effectiveFailureStore.lifecycle.enabled;
  return dataRetention
    ? { lifecycle: { enabled: { data_retention: dataRetention } } }
    : { lifecycle: { disabled: {} } };
};
