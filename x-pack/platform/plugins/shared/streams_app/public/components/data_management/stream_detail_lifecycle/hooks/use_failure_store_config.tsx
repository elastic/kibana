/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { isEnabledFailureStore, isRoot } from '@kbn/streams-schema';
import {
  isDisabledLifecycleFailureStore,
  isInheritFailureStore,
  type FailureStoreDisabled,
  type FailureStoreDisabledLifecycle,
  type FailureStoreEnabled,
  type FailureStoreInherit,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import { useFailureStoreDefaultRetention } from './use_failure_store_default_retention';

export function transformFailureStoreConfig(update: {
  failureStoreEnabled?: boolean;
  customRetentionPeriod?: string;
  lifecycleEnabled?: boolean;
  inherit?: boolean;
}) {
  const failureStoreEnabled = update.failureStoreEnabled ?? false;
  if (update.inherit) {
    return { inherit: {} } as FailureStoreInherit;
  } else if (!failureStoreEnabled) {
    return { disabled: {} } as FailureStoreDisabled;
  } else {
    if (update.lifecycleEnabled === false) {
      return { lifecycle: { disabled: {} } } as FailureStoreDisabledLifecycle;
    } else {
      return {
        lifecycle: { enabled: { data_retention: update.customRetentionPeriod } },
      } as FailureStoreEnabled;
    }
  }
}

export function useFailureStoreConfig(definition: Streams.ingest.all.GetResponse) {
  const { effective_failure_store: failureStore } = definition;

  const isWired = Streams.WiredStream.GetResponse.is(definition);
  const isClassicStream = Streams.ClassicStream.GetResponse.is(definition);
  const isRootStream = isRoot(definition.stream.name);

  const failureStoreEnabled = isEnabledFailureStore(failureStore);
  const defaultRetentionPeriod = useFailureStoreDefaultRetention(definition.stream.name);
  const isDisabledLifecycle = isDisabledLifecycleFailureStore(failureStore);
  const customRetentionPeriod =
    failureStoreEnabled && !isDisabledLifecycle
      ? (failureStore as FailureStoreEnabled).lifecycle.enabled.data_retention
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
    isDisabledLifecycle,
  };
}
