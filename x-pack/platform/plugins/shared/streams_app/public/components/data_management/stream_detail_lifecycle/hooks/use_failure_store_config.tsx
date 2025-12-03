/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { isEnabledFailureStore, isRoot } from '@kbn/streams-schema';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import {
  isDisabledLifecycleFailureStore,
  isInheritFailureStore,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import { useFailureStoreDefaultRetention } from './use_failure_store_default_retention';

export function transformFailureStoreConfig(update: {
  failureStoreEnabled?: boolean;
  customRetentionPeriod?: string;
  retentionDisabled?: boolean;
  inherit?: boolean;
}): FailureStore {
  const failureStoreEnabled = update.failureStoreEnabled ?? false;

  // Inherit
  if ('inherit' in update && update.inherit) {
    return { inherit: {} };
  }

  // Disabled
  if (!failureStoreEnabled) {
    return { disabled: {} };
  }

  // Disabled lifecycle
  if ('retentionDisabled' in update && update.retentionDisabled) {
    return { lifecycle: { disabled: {} } };
  }

  // Enabled
  const customRetentionPeriod =
    'customRetentionPeriod' in update ? update.customRetentionPeriod : undefined;

  return {
    lifecycle: { enabled: { data_retention: customRetentionPeriod } },
  };
}

export function useFailureStoreConfig(definition: Streams.ingest.all.GetResponse) {
  const { effective_failure_store: failureStore } = definition;

  const isWired = Streams.WiredStream.GetResponse.is(definition);
  const isClassicStream = Streams.ClassicStream.GetResponse.is(definition);
  const isRootStream = isRoot(definition.stream.name);

  const failureStoreEnabled = isEnabledFailureStore(failureStore);
  const { value: defaultRetentionPeriod, refresh: refreshDefaultRetention } =
    useFailureStoreDefaultRetention(definition.stream.name);
  const retentionDisabled = isDisabledLifecycleFailureStore(failureStore);
  const customRetentionPeriod =
    failureStoreEnabled && !retentionDisabled
      ? failureStore.lifecycle.enabled.data_retention
      : undefined;
  const isCurrentlyInherited = isInheritFailureStore(definition.stream.ingest.failure_store);
  const canShowInherit = (isWired && !isRootStream) || isClassicStream;

  return {
    defaultRetentionPeriod,
    customRetentionPeriod,
    failureStoreEnabled,
    inheritOptions: {
      canShowInherit,
      isWired,
      isCurrentlyInherited,
    },
    retentionDisabled,
    refreshDefaultRetention,
  };
}
