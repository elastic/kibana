/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit, StreamsV2 } from '@kbn/streams-schema';
import type { Unit } from '../../../services/unit_repository';
import { resolveSourceCapabilities, type SourceEnvironment } from './source_helpers';
import type {
  ConfiguredSource,
  SourceApiKey,
  SourceRuntimeMetadata,
  SourceStatus,
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

const OTLP_SIGNALS: StreamsV2.OtlpSignal[] = ['logs', 'metrics', 'traces'];

const DEFAULT_SUPPORTED_TELEMETRY: Record<SourceType, UnitSource['supported_telemetry']> = {
  otlp: ['logs', 'metrics', 'traces'],
  es_otlp: ['logs', 'metrics', 'traces'],
  prometheus_remote_write: ['metrics'],
  es_prometheus_remote_write: ['metrics'],
  async_bulk: ['docs'],
  bulk: ['docs'],
};

export const isSupportedSourceType = (type: string): type is SourceType =>
  SUPPORTED_SOURCE_TYPES.includes(type as SourceType);

export const createUnitSource = ({
  id,
  name,
  type,
}: {
  id: string;
  name: string;
  type: SourceType;
}): UnitSource => ({
  id,
  name,
  type,
  supported_telemetry: DEFAULT_SUPPORTED_TELEMETRY[type],
});

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

export const createRuntimeMetadata = (
  source: ConfiguredSource,
  environment: SourceEnvironment
): SourceRuntimeMetadata => {
  const { endpoint, endpoints } = resolveSourceCapabilities({
    type: source.type,
    sourceId: source.id,
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
  status,
  apiKeys,
}: {
  source: ConfiguredSource;
  metadata: SourceRuntimeMetadata;
  status: SourceStatus;
  apiKeys: SourceApiKey[];
}): SourceViewModel => ({
  ...source,
  ...metadata,
  status,
  apiKeys,
});

function otlpSignalsFromTelemetry(
  supportedTelemetry: UnitSource['supported_telemetry']
): StreamsV2.NonEmptyArray<StreamsV2.OtlpSignal> | undefined {
  const signals = supportedTelemetry.filter((signal): signal is StreamsV2.OtlpSignal =>
    OTLP_SIGNALS.includes(signal as StreamsV2.OtlpSignal)
  );
  const [firstSignal, ...restSignals] = signals;

  if (!firstSignal) {
    return undefined;
  }

  return [firstSignal, ...restSignals];
}
