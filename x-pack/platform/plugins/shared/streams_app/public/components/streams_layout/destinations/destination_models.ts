/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVALID_STREAM_NAME_CHARACTERS,
  INVALID_STREAM_NAME_PREFIXES,
  RESERVED_STREAM_NAMES,
} from '@kbn/streams-schema';
import type { StreamsUnit } from '@kbn/streams-schema';
import type { Unit } from '../../../services/unit_repository';
import {
  AUTO_INDEX_PATTERNS,
  type AutoWritePatternValidationError,
  type DestinationSignal,
  type DestinationType,
  type DestinationViewModel,
  type ElasticsearchDestinationFormData,
  type StaticIndexValidationError,
} from './types';

/** streams-spec elasticsearch.schema.yaml: an index containing `{{` is a template. */
const INDEX_TEMPLATE_PATTERN = /\{\{/;
const MAX_INDEX_NAME_BYTES = 255;

export type UnitDestination = NonNullable<StreamsUnit.Configuration['destinations']>[number];

const LOCAL_ELASTICSEARCH_TYPE: DestinationType = 'elasticsearch';

export const DESTINATION_SIGNALS: DestinationSignal[] = ['logs', 'metrics', 'traces'];

const AUTO_PATTERN_BY_SIGNAL: Record<DestinationSignal, string> = {
  logs: 'logs-*-*',
  metrics: 'metrics-*-*',
  traces: 'traces-*-*',
};

export { AUTO_INDEX_PATTERNS };

const AUTO_WRITE_PATTERN_INVALID_CHARS = /[\\/?"<>|,#:\s]/;

export const SIGNAL_INDEX_FIELDS: Record<
  DestinationSignal,
  keyof Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'>
> = {
  logs: 'logsIndex',
  metrics: 'metricsIndex',
  traces: 'tracesIndex',
};

export const getStaticIndexRemainder = (signal: DestinationSignal, index: string): string => {
  const prefix = `${signal}-`;
  return index.startsWith(prefix) ? index.slice(prefix.length) : index;
};

export const composeStaticIndex = (signal: DestinationSignal, remainder: string): string => {
  const value = remainder.trim();
  if (!value) {
    return '';
  }
  return value.startsWith(`${signal}-`) ? value : `${signal}-${value}`;
};

export const composeStaticIndexesForAll = (
  remainder: string
): Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'> => ({
  logsIndex: composeStaticIndex('logs', remainder),
  metricsIndex: composeStaticIndex('metrics', remainder),
  tracesIndex: composeStaticIndex('traces', remainder),
});

export const haveStaticIndexRemaindersDiverged = (
  indexes: Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'>
): boolean => {
  const remainders = DESTINATION_SIGNALS.map((signal) =>
    getStaticIndexRemainder(signal, indexes[SIGNAL_INDEX_FIELDS[signal]])
  );
  return new Set(remainders).size > 1;
};

export const getUnitDestinations = (unit: Unit): UnitDestination[] => unit.unit.destinations ?? [];

export const withUnitDestinations = (unit: Unit, destinations: UnitDestination[]): Unit => ({
  ...unit,
  unit: {
    ...unit.unit,
    destinations,
  },
});

const readConfigEntry = (
  destination: UnitDestination,
  name: string,
  signal?: DestinationSignal
) => {
  const entries = destination.config?.filter((candidate) => candidate.name === name) ?? [];
  const scoped = signal
    ? entries.find((candidate) => candidate.telemetry?.includes(signal))
    : undefined;
  const unscoped = entries.find((candidate) => !candidate.telemetry);
  return scoped ?? unscoped;
};

const readConfigString = (
  destination: UnitDestination,
  name: string,
  signal?: DestinationSignal
): string | undefined => {
  const value = readConfigEntry(destination, name, signal)?.value;
  return typeof value === 'string' && value.trim() ? value : undefined;
};

const readConfigStringArray = (
  destination: UnitDestination,
  name: string
): string[] | undefined => {
  const value = readConfigEntry(destination, name)?.value;
  const patterns = Array.isArray(value)
    ? value.filter(
        (pattern): pattern is string => typeof pattern === 'string' && pattern.trim().length > 0
      )
    : typeof value === 'string'
    ? value
        .split(',')
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern.length > 0)
    : [];
  return patterns.length > 0 ? patterns : undefined;
};

export const indexUsesTemplate = (index: string): boolean => INDEX_TEMPLATE_PATTERN.test(index);

const inferSignalFromIndex = (index: string | undefined): DestinationSignal | undefined => {
  if (!index) {
    return undefined;
  }
  return DESTINATION_SIGNALS.find((signal) => index.startsWith(`${signal}-`));
};

export const readDestinationSignals = (destination: UnitDestination): DestinationSignal[] => {
  const fromSupported = (destination.supported_telemetry ?? []).filter(
    (candidate): candidate is DestinationSignal =>
      DESTINATION_SIGNALS.includes(candidate as DestinationSignal)
  );
  if (fromSupported.length > 0) {
    return fromSupported;
  }
  const inferred = inferSignalFromIndex(readConfigString(destination, 'index'));
  return [inferred ?? 'logs'];
};

export const getFormDestinationSignals = (
  elasticsearch: ElasticsearchDestinationFormData
): DestinationSignal[] => {
  const filled = DESTINATION_SIGNALS.filter((signal) =>
    elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim()
  );
  if (elasticsearch.auto && filled.length === 0) {
    return [...DESTINATION_SIGNALS];
  }
  return filled;
};

export interface DestinationCreateSpec {
  signals: DestinationSignal[];
  index?: string;
  patterns?: string[];
}

export const getDestinationCreateSpecs = (
  elasticsearch: ElasticsearchDestinationFormData
): DestinationCreateSpec[] => {
  if (elasticsearch.auto) {
    const filled = DESTINATION_SIGNALS.flatMap((signal) => {
      const pattern = elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim();
      return pattern ? [{ signal, pattern }] : [];
    });
    if (filled.length === 0) {
      return [{ signals: [...DESTINATION_SIGNALS] }];
    }
    return [
      {
        signals: filled.map(({ signal }) => signal),
        patterns: filled.map(({ pattern }) => pattern),
      },
    ];
  }
  return DESTINATION_SIGNALS.flatMap((signal) => {
    const index = elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim();
    return index ? [{ signals: [signal], index }] : [];
  });
};

export const getDestinationWritePatterns = (
  destination: Pick<DestinationViewModel, 'signals' | 'mode' | 'index' | 'indexPatterns'>
): string[] => {
  if (destination.mode === 'auto' || !destination.index) {
    if (destination.indexPatterns?.length) {
      return destination.indexPatterns;
    }
    return destination.signals.map((signal) => AUTO_PATTERN_BY_SIGNAL[signal]);
  }
  return [destination.index];
};

export const toDestinationViewModel = (
  destination: UnitDestination
): DestinationViewModel | undefined => {
  if (destination.type !== LOCAL_ELASTICSEARCH_TYPE) {
    return undefined;
  }

  const signals = readDestinationSignals(destination);
  const index =
    readConfigString(destination, 'index') ?? readConfigString(destination, 'index', signals[0]);
  return {
    id: destination.id,
    name: destination.name ?? destination.id,
    type: LOCAL_ELASTICSEARCH_TYPE,
    signals,
    mode: index ? 'static' : 'auto',
    index,
    indexPatterns: index ? undefined : readConfigStringArray(destination, 'index_patterns'),
  };
};

export const getConfiguredDestinations = (unit: Unit): DestinationViewModel[] =>
  getUnitDestinations(unit).flatMap((destination) => {
    const configured = toDestinationViewModel(destination);
    return configured ? [configured] : [];
  });

/**
 * Static: one Elasticsearch destination per signal with an unscoped `index`. The
 * transpiler rejects telemetry-scoped indices:
 * https://github.com/elastic/streams-transpiler/blob/89413933a7ce9d71e61032afa1c368d155eb3799/internal/registry/destinations_cloud_elasticsearch.go#L150-L152
 *
 * Auto: one destination. Full auto omits `index` and `index_patterns` (key
 * scoped to {logs,metrics,traces}-*-*). Auto with write targets stores those
 * globs on `index_patterns` and scopes the key to the same list.
 */
export const createUnitDestination = ({
  id,
  name,
  signals,
  index,
  patterns,
  apiKey,
}: {
  id: string;
  name: string;
  signals: readonly DestinationSignal[];
  index?: string;
  patterns?: readonly string[];
  apiKey?: string;
}): UnitDestination => {
  const config: NonNullable<UnitDestination['config']> = [];
  const trimmedIndex = index?.trim();
  if (trimmedIndex) {
    config.push({ name: 'index', value: trimmedIndex });
  } else {
    const trimmedPatterns = patterns?.map((pattern) => pattern.trim()).filter(Boolean);
    if (trimmedPatterns && trimmedPatterns.length > 0) {
      config.push({ name: 'index_patterns', value: [...trimmedPatterns] });
    }
  }

  if (apiKey) {
    config.push({ name: 'api_key', value: apiKey });
  }

  return {
    id,
    name,
    type: LOCAL_ELASTICSEARCH_TYPE,
    supported_telemetry: [...signals],
    config,
  };
};

/** Whether `value` has the `<signal>-<dataset>-<namespace>` shape the built-in data stream templates match. */
const hasSignalDataStreamShape = (signal: DestinationSignal, value: string): boolean => {
  const prefix = `${signal}-`;
  if (!value.startsWith(prefix)) {
    return false;
  }
  const segments = value.slice(prefix.length).split('-');
  return segments.length === 2 && segments.every((segment) => segment.length > 0);
};

export const validateAutoWritePattern = (
  signal: DestinationSignal,
  pattern: string
): Exclude<AutoWritePatternValidationError, 'required'> | undefined => {
  const value = pattern.trim();
  if (!value) {
    return undefined;
  }
  if (value !== value.toLowerCase()) {
    return 'uppercase';
  }
  if (AUTO_WRITE_PATTERN_INVALID_CHARS.test(value)) {
    return 'invalidCharacter';
  }
  if (!hasSignalDataStreamShape(signal, value)) {
    return 'signalPattern';
  }
  return undefined;
};

export const validateStaticSignalIndex = (
  signal: DestinationSignal,
  index: string
): StaticIndexValidationError | undefined => {
  const value = index.trim();
  if (!value) {
    return undefined;
  }
  if (indexUsesTemplate(value)) {
    return 'template';
  }
  if (INVALID_STREAM_NAME_CHARACTERS.some((char) => value.includes(char))) {
    return 'invalidCharacter';
  }
  if (value !== value.toLowerCase()) {
    return 'uppercase';
  }
  if (
    RESERVED_STREAM_NAMES.includes(value) ||
    INVALID_STREAM_NAME_PREFIXES.some((prefix) => value.startsWith(prefix)) ||
    new TextEncoder().encode(value).length > MAX_INDEX_NAME_BYTES
  ) {
    return 'invalidName';
  }
  if (!hasSignalDataStreamShape(signal, value)) {
    return 'signalPattern';
  }
  return undefined;
};
