/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit, StreamsV2 } from '@kbn/streams-schema';
import { getUnitConnections } from '../../../services/unit_connections';
import type { Unit } from '../../../services/unit_repository';
import { resolveSourceCapabilities, type SourceEnvironment } from './source_helpers';
import type {
  ConfiguredSource,
  SourceApiKey,
  SourceRuntimeMetadata,
  SourceType,
  SourceViewModel,
} from './types';

export type UnitSource = NonNullable<StreamsUnit.Configuration['sources']>[number];

const SUPPORTED_SOURCE_TYPES: SourceType[] = [
  'otlp',
  'es_otlp',
  'async_bulk',
  'prometheus_remote_write',
  'es_prometheus_remote_write',
  'bulk',
];

export type SourceSignal = StreamsV2.OtlpSignal;

/** Logs, metrics, and traces. Spec also has docs/profiles; those are not ingest choices here. */
export const SOURCE_SIGNALS: SourceSignal[] = ['logs', 'metrics', 'traces'];

const DEFAULT_SUPPORTED_TELEMETRY: Record<SourceType, UnitSource['supported_telemetry']> = {
  otlp: [...SOURCE_SIGNALS],
  es_otlp: [...SOURCE_SIGNALS],
  // Prometheus Remote Write v1 decodes only to OTel metrics.
  prometheus_remote_write: ['metrics'],
  es_prometheus_remote_write: ['metrics'],
  // Async bulk is the ECS path for logs, metrics, and traces.
  async_bulk: [...SOURCE_SIGNALS],
  bulk: ['docs'],
};

/** Signals the user can pick for this source type (empty when the type is fixed). */
export const selectableSignalsForSourceType = (type: SourceType): SourceSignal[] =>
  SOURCE_SIGNALS.filter((signal) => DEFAULT_SUPPORTED_TELEMETRY[type].includes(signal));

export const sourceTypeSelectsSignals = (type: SourceType): boolean =>
  selectableSignalsForSourceType(type).length > 1;

export const defaultSignalsForSourceType = (type: SourceType): SourceSignal[] =>
  sourceTypeSelectsSignals(type) ? selectableSignalsForSourceType(type) : [];

const orderedSignals = (type: SourceType, signals: readonly SourceSignal[]): SourceSignal[] =>
  selectableSignalsForSourceType(type).filter((signal) => signals.includes(signal));

export const isSupportedSourceType = (type: string): type is SourceType =>
  SUPPORTED_SOURCE_TYPES.includes(type as SourceType);

export const createUnitSource = ({
  id,
  name,
  type,
  supportedTelemetry,
}: {
  id: string;
  name: string;
  type: SourceType;
  supportedTelemetry?: UnitSource['supported_telemetry'];
}): UnitSource => ({
  id,
  name,
  type,
  supported_telemetry: supportedTelemetry ?? DEFAULT_SUPPORTED_TELEMETRY[type],
});

export const telemetryForSelectedSignals = (
  type: SourceType,
  signals: readonly SourceSignal[]
): UnitSource['supported_telemetry'] => {
  if (!sourceTypeSelectsSignals(type)) {
    return DEFAULT_SUPPORTED_TELEMETRY[type];
  }
  const selected = orderedSignals(type, signals);
  return selected.length > 0 ? selected : DEFAULT_SUPPORTED_TELEMETRY[type];
};

export const createConfiguredSource = ({
  id,
  name,
  type,
}: {
  id: string;
  name: string;
  type: SourceType;
}): ConfiguredSource => {
  const configured = toConfiguredSource(createUnitSource({ id, name, type }));
  if (!configured) {
    throw new Error(`Unsupported source type [${type}].`);
  }
  return configured;
};

export const getUnitSources = (unit: Unit): UnitSource[] => unit.unit.sources ?? [];

export const getConfiguredSources = (unit: Unit): ConfiguredSource[] =>
  getUnitSources(unit).flatMap((source) => {
    const configured = toConfiguredSource(source);
    return configured ? [configured] : [];
  });

export const withUnitSources = (unit: Unit, sources: UnitSource[]): Unit => ({
  ...unit,
  unit: {
    ...unit.unit,
    sources,
  },
});

export const toConfiguredSource = (source: UnitSource): ConfiguredSource | undefined => {
  if (!isSupportedSourceType(source.type)) {
    return undefined;
  }

  const id = source.id;
  const name = source.name ?? source.id;
  const pathTemplate = source.path_template ? { path_template: source.path_template } : {};
  const otlpSignals = otlpSignalsFromTelemetry(source.supported_telemetry);

  switch (source.type) {
    case 'otlp':
      return {
        id,
        name,
        type: 'otlp',
        to: null,
        ...pathTemplate,
        ...(otlpSignals ? { config: { otlp: { signals: otlpSignals } } } : {}),
      };
    case 'es_otlp':
      return {
        id,
        name,
        type: 'es_otlp',
        to: null,
        ...pathTemplate,
        ...(otlpSignals ? { config: { es_otlp: { signals: otlpSignals } } } : {}),
      };
    case 'async_bulk':
      return { id, name, type: 'async_bulk', to: null, ...pathTemplate };
    case 'prometheus_remote_write':
      return { id, name, type: 'prometheus_remote_write', to: null, ...pathTemplate };
    case 'es_prometheus_remote_write':
      return { id, name, type: 'es_prometheus_remote_write', to: null, ...pathTemplate };
    case 'bulk':
      return { id, name, type: 'bulk', to: null, ...pathTemplate };
  }
};

/** Destination names each configured source currently forwards to. */
export const connectedDestinationLabels = (unit: Unit): Record<string, string[]> => {
  const sources = getConfiguredSources(unit);
  const destinations = unit.unit.destinations ?? [];
  const nameById = new Map(
    destinations.map((destination) => [destination.id, destination.name?.trim() || destination.id])
  );
  const labels: Record<string, string[]> = {};
  for (const connection of getUnitConnections(
    unit,
    new Set(sources.map(({ id }) => id)),
    new Set(destinations.map(({ id }) => id))
  )) {
    const label = nameById.get(connection.destinationId) ?? connection.destinationId;
    labels[connection.sourceId] = [...(labels[connection.sourceId] ?? []), label];
  }
  return labels;
};

export const createRuntimeMetadata = (
  source: ConfiguredSource,
  environment: SourceEnvironment
): SourceRuntimeMetadata => {
  const { endpoint, endpoints } = resolveSourceCapabilities({
    type: source.type,
    sourceId: source.id,
    signals: readConfiguredOtlpSignals(source),
    ...environment,
  });
  return {
    endpoint,
    endpoints,
    destinations: [],
  };
};

export const createSourceViewModel = ({
  source,
  metadata,
  apiKeys,
  supportedTelemetry,
}: {
  source: ConfiguredSource;
  metadata: SourceRuntimeMetadata;
  apiKeys: SourceApiKey[];
  supportedTelemetry?: UnitSource['supported_telemetry'];
}): SourceViewModel => ({
  ...source,
  ...metadata,
  apiKeys,
  supportedTelemetry,
});

/** Logs, metrics, and traces this source accepts, for badges and similar UI. */
export const getSourceDisplaySignals = (
  source: ConfiguredSource,
  supportedTelemetry?: UnitSource['supported_telemetry']
): SourceSignal[] => {
  const configured = readConfiguredOtlpSignals(source);
  if (configured && configured.length > 0) {
    return SOURCE_SIGNALS.filter((signal) => configured.includes(signal));
  }
  if (supportedTelemetry !== undefined) {
    return SOURCE_SIGNALS.filter((signal) => supportedTelemetry.includes(signal));
  }
  return SOURCE_SIGNALS.filter((signal) =>
    DEFAULT_SUPPORTED_TELEMETRY[source.type].includes(signal)
  );
};

const readConfiguredOtlpSignals = (source: ConfiguredSource): SourceSignal[] | undefined => {
  if (source.type === 'otlp') {
    return source.config?.otlp?.signals;
  }
  if (source.type === 'es_otlp') {
    return source.config?.es_otlp?.signals;
  }
  return undefined;
};

function otlpSignalsFromTelemetry(
  supportedTelemetry: UnitSource['supported_telemetry']
): StreamsV2.NonEmptyArray<StreamsV2.OtlpSignal> | undefined {
  const signals = supportedTelemetry.filter((signal): signal is StreamsV2.OtlpSignal =>
    SOURCE_SIGNALS.includes(signal as StreamsV2.OtlpSignal)
  );
  const [firstSignal, ...restSignals] = signals;

  if (!firstSignal) {
    return undefined;
  }

  return [firstSignal, ...restSignals];
}
