/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestination } from './destination_models';
import { DESTINATION_SIGNALS, SIGNAL_INDEX_FIELDS } from './destination_models';
import {
  REMOTE_ELASTICSEARCH_ENDPOINT_ENTRY,
  REMOTE_ELASTICSEARCH_TYPE,
  remoteElasticsearchCredentialName,
} from './remote_elasticsearch_constants';
import type {
  DestinationSignal,
  ElasticsearchDestinationFormData,
  RemoteElasticsearchDestinationFormData,
} from './types';

/** Trimmed index name for each filled signal in Fixed. Empty in Auto. */
export const getRemoteIndexBySignal = (
  form: ElasticsearchDestinationFormData
): Partial<Record<DestinationSignal, string>> => {
  const indexBySignal: Partial<Record<DestinationSignal, string>> = {};
  if (form.auto) {
    return indexBySignal;
  }
  for (const signal of DESTINATION_SIGNALS) {
    const index = form[SIGNAL_INDEX_FIELDS[signal]].trim();
    if (index) {
      indexBySignal[signal] = index;
    }
  }
  return indexBySignal;
};

/**
 * One node per remote cluster. Fixed saves one unscoped `index` when all filled signals share a
 * name, otherwise one telemetry-scoped `index` per signal.
 */
export const createRemoteElasticsearchUnitDestination = ({
  id,
  name,
  endpoint,
  auto,
  logsIndex,
  metricsIndex,
  tracesIndex,
}: { id: string; name: string } & Omit<
  RemoteElasticsearchDestinationFormData,
  'apiKey'
>): UnitDestination => {
  const indexBySignal = getRemoteIndexBySignal({ auto, logsIndex, metricsIndex, tracesIndex });
  const indexed = DESTINATION_SIGNALS.flatMap((signal) => {
    const value = indexBySignal[signal];
    return value ? [{ signal, value }] : [];
  });
  const indexEntries =
    new Set(indexed.map(({ value }) => value)).size === 1
      ? [{ name: 'index', value: indexed[0].value }]
      : indexed.map(({ signal, value }) => ({ name: 'index', value, telemetry: [signal] }));

  return {
    id,
    name,
    type: REMOTE_ELASTICSEARCH_TYPE,
    supported_telemetry: auto ? [...DESTINATION_SIGNALS] : indexed.map(({ signal }) => signal),
    config: [
      { name: REMOTE_ELASTICSEARCH_ENDPOINT_ENTRY, value: endpoint.trim() },
      ...indexEntries,
      { name: 'api_key', value: { credential: remoteElasticsearchCredentialName(id) } },
    ],
  };
};
