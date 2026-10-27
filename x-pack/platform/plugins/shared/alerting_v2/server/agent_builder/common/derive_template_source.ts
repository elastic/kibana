/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

const DATA_STREAM_TYPES = new Set(['logs', 'metrics', 'traces', 'synthetics', 'profiling']);
const WILDCARD = /[*?]/;

export interface TemplateDataStream {
  type: string;
  dataset: string;
}

export interface TemplateSource {
  /** Sources as written in the query's `FROM` / `TS` command, including any CCS prefix. */
  index_patterns: string[];
  /** Data streams named by the sources, following `{type}-{dataset}-{namespace}`. */
  data_streams: TemplateDataStream[];
  /** Best-effort integration name: the dataset prefix before the first dot. */
  integration?: string;
}

const stripRemoteClusterPrefix = (source: string): string => {
  const colonIndex = source.indexOf(':');
  return colonIndex === -1 ? source : source.slice(colonIndex + 1);
};

const parseDataStreamSource = (
  source: string
): { dataStream?: TemplateDataStream; integration?: string } => {
  const [type, dataset] = stripRemoteClusterPrefix(source).split('-');
  if (!type || !dataset || !DATA_STREAM_TYPES.has(type)) {
    return {};
  }

  const [integrationPart] = dataset.split('.');
  const integration =
    integrationPart && !WILDCARD.test(integrationPart) ? integrationPart : undefined;
  const dataStream = WILDCARD.test(dataset) ? undefined : { type, dataset };

  return { dataStream, integration };
};

/**
 * Derives the data source of an ES|QL rule query from its `FROM` / `TS` sources.
 * Broad patterns such as `logs-*` yield no data stream and no integration.
 */
export const deriveTemplateSource = (esqlQuery: string): TemplateSource => {
  const indexPatterns = getIndexPatternFromESQLQuery(esqlQuery)
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);

  const dataStreams = new Map<string, TemplateDataStream>();
  const integrations = new Set<string>();

  for (const source of indexPatterns) {
    const { dataStream, integration } = parseDataStreamSource(source);
    if (dataStream) {
      dataStreams.set(`${dataStream.type}-${dataStream.dataset}`, dataStream);
    }
    if (integration) {
      integrations.add(integration);
    }
  }

  // A query spanning several integrations has no single owner.
  const [integration] = integrations.size === 1 ? [...integrations] : [];

  return {
    index_patterns: indexPatterns,
    data_streams: [...dataStreams.values()],
    ...(integration ? { integration } : {}),
  };
};
