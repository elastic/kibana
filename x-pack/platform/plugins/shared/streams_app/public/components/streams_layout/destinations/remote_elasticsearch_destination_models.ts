/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestination } from '@kbn/streams-schema';
import {
  DESTINATION_SIGNALS,
  PREFIXED_DESTINATION_SIGNALS,
  SIGNAL_INDEX_FIELDS,
} from './destination_models';
import {
  REMOTE_ELASTICSEARCH_TYPE,
  type DestinationSignal,
  type RemoteElasticsearchDestinationFormData,
} from './types';

type RemoteRoutingFormData = Pick<
  RemoteElasticsearchDestinationFormData,
  'auto' | 'logsIndex' | 'metricsIndex' | 'tracesIndex' | 'docsIndex'
>;

export const remoteElasticsearchCredentialName = (id: string): string => `${id}-api-key`;

/** Trimmed index name for each filled signal in Fixed. Empty in Auto. */
export const getRemoteIndexBySignal = (
  form: RemoteRoutingFormData
): Partial<Record<DestinationSignal, string>> => {
  const indexBySignal: Partial<Record<DestinationSignal, string>> = {};
  if (form.auto) {
    return indexBySignal;
  }
  for (const signal of PREFIXED_DESTINATION_SIGNALS) {
    const index = form[SIGNAL_INDEX_FIELDS[signal]].trim();
    if (index) {
      indexBySignal[signal] = index;
    }
  }
  const docsIndex = form.docsIndex.trim();
  if (docsIndex) {
    indexBySignal.docs = docsIndex;
  }
  return indexBySignal;
};

/**
 * One node per remote cluster. Fixed saves one unscoped `index` when all filled OTel signals share
 * a name, otherwise one telemetry-scoped `index` per signal. Docs always gets its own scoped entry.
 */
export const createRemoteElasticsearchUnitDestination = ({
  id,
  name,
  description,
  endpoint,
  auto,
  logsIndex,
  metricsIndex,
  tracesIndex,
  docsIndex,
}: {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
} & RemoteRoutingFormData): UnitDestination => {
  const indexBySignal = getRemoteIndexBySignal({
    auto,
    logsIndex,
    metricsIndex,
    tracesIndex,
    docsIndex,
  });
  const indexed = PREFIXED_DESTINATION_SIGNALS.flatMap((signal) => {
    const value = indexBySignal[signal];
    return value ? [{ signal, value }] : [];
  });
  const otelIndexEntries =
    new Set(indexed.map(({ value }) => value)).size === 1
      ? [{ name: 'index', value: indexed[0].value }]
      : indexed.map(({ signal, value }) => ({ name: 'index', value, telemetry: [signal] }));
  // A scoped entry wins over the unscoped one, so the shared OTel name never reaches docs.
  const docsIndexEntries = indexBySignal.docs
    ? [{ name: 'index', value: indexBySignal.docs, telemetry: ['docs' as const] }]
    : [];

  const trimmedDescription = description?.trim();
  return {
    id,
    name,
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    type: REMOTE_ELASTICSEARCH_TYPE,
    supported_telemetry: auto
      ? [...DESTINATION_SIGNALS]
      : DESTINATION_SIGNALS.filter((signal) => indexBySignal[signal]),
    config: [
      { name: 'endpoint', value: endpoint.trim() },
      ...otelIndexEntries,
      ...docsIndexEntries,
      { name: 'api_key', value: { credential: remoteElasticsearchCredentialName(id) } },
    ],
  };
};
