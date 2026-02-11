/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '../models/streams';
import type { WiredIngestStreamEffectiveFailureStore } from '../models/ingest/failure_store';
import {
  isDisabledLifecycleFailureStore,
  isEnabledFailureStore,
  isEnabledLifecycleFailureStore,
  isInheritFailureStore,
  isDisabledFailureStore,
} from '../models/ingest/failure_store';
import { getSegments } from '../shared/hierarchy';

export function findInheritedFailureStore(
  definition: Streams.WiredStream.Definition,
  ancestors: Streams.WiredStream.Definition[]
): WiredIngestStreamEffectiveFailureStore {
  const originDefinition = [...ancestors, definition]
    .sort((a, b) => getSegments(a.name).length - getSegments(b.name).length)
    .findLast(({ ingest }) => !isInheritFailureStore(ingest.failure_store));

  if (!originDefinition) {
    throw new Error('Unable to find inherited failure store configuration');
  }

  if (isInheritFailureStore(originDefinition.ingest.failure_store)) {
    throw new Error('Wired streams can only inherit a defined failure store');
  }

  const failureStore = originDefinition.ingest.failure_store;

  if (isEnabledFailureStore(failureStore)) {
    if (isEnabledLifecycleFailureStore(failureStore)) {
      const dataRetention = failureStore.lifecycle.enabled.data_retention;
      return {
        lifecycle: {
          enabled: {
            ...(dataRetention ? { data_retention: dataRetention } : {}),
            is_default_retention: dataRetention ? false : true,
          },
        },
        from: originDefinition.name,
      };
    } else if (isDisabledLifecycleFailureStore(failureStore)) {
      return {
        lifecycle: { disabled: {} },
        from: originDefinition.name,
      };
    }
  }

  if (isDisabledFailureStore(failureStore)) {
    return {
      disabled: {},
      from: originDefinition.name,
    };
  }

  throw new Error('Invalid failure store configuration');
}
