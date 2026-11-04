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
  UNIT_DESTINATION_SIGNALS,
  getUnitDestinationSignalTargets,
  readUnitDestinationConfigValue,
  readUnitDestinationSignals,
} from '@kbn/streams-schema';
import type { UnitDestination } from '@kbn/streams-schema';
import type { Unit } from '../../../services/unit_repository';
import type {
  AutoWritePatternValidationError,
  DestinationSignal,
  DestinationSignalTargets,
  DestinationViewModel,
  ElasticsearchDestinationFormData,
  S3DestinationViewModel,
  StaticIndexValidationError,
} from './types';

/** streams-spec elasticsearch.schema.yaml: an index containing `{{` is a template. */
const INDEX_TEMPLATE_PATTERN = /\{\{/;
const MAX_INDEX_NAME_BYTES = 255;

const LOCAL_ELASTICSEARCH_TYPE = 'elasticsearch' as const;

export const DESTINATION_SIGNALS: DestinationSignal[] = [...UNIT_DESTINATION_SIGNALS];

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

export const getUnitDestinations = (unit: Unit): UnitDestination[] => unit.unit.destinations ?? [];

export const withUnitDestinations = (unit: Unit, destinations: UnitDestination[]): Unit => ({
  ...unit,
  unit: {
    ...unit.unit,
    destinations,
  },
});

const readConfigString = (destination: UnitDestination, name: string): string | undefined => {
  const value = readUnitDestinationConfigValue(destination, name);
  return typeof value === 'string' && value.trim() ? value : undefined;
};

export const indexUsesTemplate = (index: string): boolean => INDEX_TEMPLATE_PATTERN.test(index);

/** Signals the form creates the destination for. */
export const getFormDestinationSignals = (
  elasticsearch: ElasticsearchDestinationFormData
): DestinationSignal[] => {
  if (elasticsearch.auto) {
    return elasticsearch.useCustomWritePatterns
      ? DESTINATION_SIGNALS.filter((signal) => elasticsearch.customSignals.includes(signal))
      : [...DESTINATION_SIGNALS];
  }
  return DESTINATION_SIGNALS.filter((signal) => elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim());
};

/** Per-signal targets of the single destination the form creates. */
export const getDestinationCreateSpec = (
  elasticsearch: ElasticsearchDestinationFormData
): DestinationSignalTargets => {
  const signals = getFormDestinationSignals(elasticsearch);
  const valueBySignal = signals.flatMap((signal) => {
    const value = elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim();
    return value ? [[signal, value] as const] : [];
  });
  if (elasticsearch.auto) {
    return {
      signals,
      indexBySignal: {},
      writePatternsBySignal: Object.fromEntries(
        valueBySignal.map(([signal, pattern]) => [signal, [pattern]])
      ),
    };
  }
  return {
    signals,
    indexBySignal: Object.fromEntries(valueBySignal),
    writePatternsBySignal: {},
  };
};

/** Distinct static indices of a destination. */
export const getDestinationIndices = (destination: DestinationSignalTargets): string[] => [
  ...new Set(
    destination.signals.flatMap((signal) => {
      const index = destination.indexBySignal[signal];
      return index ? [index] : [];
    })
  ),
];

export const toS3DestinationViewModel = (destination: UnitDestination): S3DestinationViewModel => ({
  id: destination.id,
  name: destination.name ?? destination.id,
  description: destination.description?.trim() || undefined,
  type: 's3',
  signals: readUnitDestinationSignals(destination),
  bucket: readConfigString(destination, 'bucket') ?? '',
  region: readConfigString(destination, 'region') ?? '',
  prefix: readConfigString(destination, 'prefix'),
});

export const toDestinationViewModel = (
  destination: UnitDestination
): DestinationViewModel | undefined => {
  if (destination.type === 's3') {
    return toS3DestinationViewModel(destination);
  }
  if (destination.type !== LOCAL_ELASTICSEARCH_TYPE) {
    return undefined;
  }

  const targets = getUnitDestinationSignalTargets(destination);
  return {
    id: destination.id,
    name: destination.name ?? destination.id,
    description: destination.description?.trim() || undefined,
    type: LOCAL_ELASTICSEARCH_TYPE,
    mode: Object.keys(targets.indexBySignal).length > 0 ? 'static' : 'auto',
    ...targets,
  };
};

export const getConfiguredDestinations = (unit: Unit): DestinationViewModel[] =>
  getUnitDestinations(unit).flatMap((destination) => {
    const configured = toDestinationViewModel(destination);
    return configured ? [configured] : [];
  });

/**
 * One Elasticsearch destination for the selected signals, with config scoped per signal
 * (https://github.com/elastic/streams-spec/pull/393).
 *
 * Each signal gets either a scoped `index` (static) or, when routed from document
 * metadata (auto), an optional scoped `write_patterns`. The `api_key` is shared.
 */
export const createUnitDestination = ({
  id,
  name,
  description,
  signals,
  indexBySignal,
  writePatternsBySignal,
  apiKey,
}: DestinationSignalTargets & {
  id: string;
  name: string;
  description?: string;
  apiKey?: string;
}): UnitDestination => {
  const config: NonNullable<UnitDestination['config']> = [];
  for (const signal of signals) {
    const index = indexBySignal[signal]?.trim();
    if (index) {
      config.push({ name: 'index', telemetry: [signal], value: index });
    }
  }
  for (const signal of signals) {
    const writePatterns = writePatternsBySignal[signal]
      ?.map((pattern) => pattern.trim())
      .filter(Boolean);
    if (writePatterns?.length) {
      config.push({ name: 'write_patterns', telemetry: [signal], value: writePatterns });
    }
  }

  if (apiKey) {
    config.push({ name: 'api_key', value: apiKey });
  }

  const trimmedDescription = description?.trim();
  return {
    id,
    name,
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
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
