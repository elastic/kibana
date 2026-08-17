/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsV2Examples, type StreamsV2 } from '@kbn/streams-schema';
import type { ConfiguredSource, SourcesUnitDefinition } from './types';

const MOCK_LATENCY_MS = 250;

export interface UnitDefinitionRepository {
  load: () => Promise<SourcesUnitDefinition>;
  persist: (unitDefinition: SourcesUnitDefinition) => Promise<SourcesUnitDefinition>;
}

let persistedUnitDefinition = toSourcesUnitDefinition(StreamsV2Examples.GET_UNIT_EXAMPLE);

export const mockUnitDefinitionRepository: UnitDefinitionRepository = {
  load: async () => {
    await waitForMockLatency();
    return cloneUnitDefinition(persistedUnitDefinition);
  },
  persist: async (unitDefinition) => {
    await waitForMockLatency();
    persistedUnitDefinition = cloneUnitDefinition(unitDefinition);
    return cloneUnitDefinition(persistedUnitDefinition);
  },
};

export const createEmptyUnitDefinition = (): SourcesUnitDefinition => ({
  sources: [],
  destinations: [],
  pipelines: [],
  pipeline_definitions: [],
  routing_nodes: [],
});

const waitForMockLatency = async (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

function cloneUnitDefinition(unitDefinition: SourcesUnitDefinition): SourcesUnitDefinition {
  return structuredClone(unitDefinition);
}

export function toSourcesUnitDefinition(
  unitDefinition: StreamsV2.UnitDefinition
): SourcesUnitDefinition {
  return {
    ...unitDefinition,
    sources: unitDefinition.sources.filter(isSupportedSource),
  };
}

function isSupportedSource(source: StreamsV2.Source): source is ConfiguredSource {
  switch (source.type) {
    case 'otlp':
    case 'es_otlp':
    case 'async_bulk':
    case 'prometheus_remote_write':
    case 'es_prometheus_remote_write':
    case 'bulk':
      return true;
    case 'syslog':
    case 'esql_query':
      return false;
  }
}
