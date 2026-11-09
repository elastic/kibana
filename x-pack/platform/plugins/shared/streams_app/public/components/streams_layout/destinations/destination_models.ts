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
import {
  REMOTE_ELASTICSEARCH_TYPE,
  type AutoWritePatternValidationError,
  type DestinationSignal,
  type DestinationSignalTargets,
  type DestinationViewModel,
  type DocsWritePatternValidationError,
  type ElasticsearchDestinationFormData,
  type FreeFormIndexValidationError,
  type PrefixedDestinationSignal,
  type RemoteElasticsearchDestinationViewModel,
  type S3DestinationViewModel,
  type StaticIndexValidationError,
} from './types';

/** An index containing `{{` or `${` is a template, which the transpiler rejects (E035). */
const INDEX_TEMPLATE_PATTERN = /\{\{|\$\{/;
/** Elasticsearch and the transpiler cap index names and write patterns at 255 UTF-8 bytes. */
export const MAX_INDEX_NAME_BYTES = 255;

const exceedsIndexNameBytes = (value: string): boolean =>
  new TextEncoder().encode(value).length > MAX_INDEX_NAME_BYTES;

const LOCAL_ELASTICSEARCH_TYPE = 'elasticsearch' as const;

export const DESTINATION_SIGNALS: DestinationSignal[] = [...UNIT_DESTINATION_SIGNALS];

export const PREFIXED_DESTINATION_SIGNALS: PrefixedDestinationSignal[] = [
  'logs',
  'metrics',
  'traces',
];

const AUTO_WRITE_PATTERN_INVALID_CHARS = /[\\/?"<>|,#:\s]/;
/** streams-transpiler#311 rejects Unicode whitespace or control characters in an index. */
const WHITESPACE_OR_CONTROL_CHARS = /[\p{White_Space}\p{Cc}]/u;
/** The managed bulk receiver only accepts an `_index` under these prefixes. */
const DOCS_INDEX_PREFIX = /^(logs|metrics|traces)-/;

export const SIGNAL_INDEX_FIELDS: Record<
  PrefixedDestinationSignal,
  keyof Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'>
> = {
  logs: 'logsIndex',
  metrics: 'metricsIndex',
  traces: 'tracesIndex',
};

export const getStaticIndexRemainder = (
  signal: PrefixedDestinationSignal,
  index: string
): string => {
  const prefix = `${signal}-`;
  return index.startsWith(prefix) ? index.slice(prefix.length) : index;
};

export const composeStaticIndex = (
  signal: PrefixedDestinationSignal,
  remainder: string
): string => {
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
  return DESTINATION_SIGNALS.filter((signal) =>
    signal !== 'docs'
      ? elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim()
      : elasticsearch.docsIndex.trim()
  );
};

/** Per-signal targets of the single destination the form creates. */
export const getDestinationCreateSpec = (
  elasticsearch: ElasticsearchDestinationFormData
): DestinationSignalTargets => {
  const signals = getFormDestinationSignals(elasticsearch);
  const valueBySignal = signals
    .filter((signal) => signal !== 'docs')
    .flatMap((signal) => {
      const value = elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim();
      return value ? [[signal, value] as const] : [];
    });
  if (elasticsearch.auto) {
    const { docsWritePatterns } = elasticsearch;
    return {
      signals,
      indexBySignal: {},
      writePatternsBySignal: {
        ...Object.fromEntries(valueBySignal.map(([signal, pattern]) => [signal, [pattern]])),
        ...(docsWritePatterns.length > 0 ? { docs: docsWritePatterns } : {}),
      },
    };
  }
  const docsIndex = elasticsearch.docsIndex.trim();
  return {
    signals,
    indexBySignal: {
      ...Object.fromEntries(valueBySignal),
      ...(docsIndex ? { docs: docsIndex } : {}),
    },
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

export const toRemoteElasticsearchDestinationViewModel = (
  destination: UnitDestination
): RemoteElasticsearchDestinationViewModel => {
  const signals = readUnitDestinationSignals(destination);
  const indexBySignal: Partial<Record<DestinationSignal, string>> = {};
  for (const signal of signals) {
    const index = readUnitDestinationConfigValue(destination, 'index', signal);
    if (typeof index === 'string' && index.trim()) {
      indexBySignal[signal] = index;
    }
  }
  return {
    id: destination.id,
    name: destination.name ?? destination.id,
    description: destination.description?.trim() || undefined,
    type: REMOTE_ELASTICSEARCH_TYPE,
    signals,
    endpoint: readConfigString(destination, 'endpoint') ?? '',
    mode: Object.keys(indexBySignal).length > 0 ? 'static' : 'auto',
    indexBySignal,
  };
};

export const toDestinationViewModel = (
  destination: UnitDestination
): DestinationViewModel | undefined => {
  if (destination.type === 's3') {
    return toS3DestinationViewModel(destination);
  }
  if (destination.type === REMOTE_ELASTICSEARCH_TYPE) {
    return toRemoteElasticsearchDestinationViewModel(destination);
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
const hasSignalDataStreamShape = (signal: PrefixedDestinationSignal, value: string): boolean => {
  const prefix = `${signal}-`;
  if (!value.startsWith(prefix)) {
    return false;
  }
  const segments = value.slice(prefix.length).split('-');
  return segments.length === 2 && segments.every((segment) => segment.length > 0);
};

export const validateAutoWritePattern = (
  signal: PrefixedDestinationSignal,
  pattern: string
): Exclude<AutoWritePatternValidationError, 'required'> | undefined => {
  const value = pattern.trim();
  if (!value) {
    return undefined;
  }
  if (exceedsIndexNameBytes(value)) {
    return 'tooLong';
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

/**
 * A full index name with no signal prefix, as remote indices and the docs index take.
 * A leading dot is rejected too, as Elasticsearch reserves those names for hidden and system indices.
 */
export const validateFreeFormIndexName = (
  index: string
): FreeFormIndexValidationError | undefined => {
  const value = index.trim();
  if (!value) {
    return undefined;
  }
  if (indexUsesTemplate(value)) {
    return 'template';
  }
  if (
    INVALID_STREAM_NAME_CHARACTERS.some((char) => value.includes(char)) ||
    WHITESPACE_OR_CONTROL_CHARS.test(value)
  ) {
    return 'invalidCharacter';
  }
  if (value !== value.toLowerCase()) {
    return 'uppercase';
  }
  if (
    RESERVED_STREAM_NAMES.includes(value) ||
    value.startsWith('.') ||
    INVALID_STREAM_NAME_PREFIXES.some((prefix) => value.startsWith(prefix)) ||
    exceedsIndexNameBytes(value)
  ) {
    return 'invalidName';
  }
  return undefined;
};

export const validateStaticSignalIndex = (
  signal: PrefixedDestinationSignal,
  index: string
): StaticIndexValidationError | undefined => {
  const value = index.trim();
  if (!value) {
    return undefined;
  }
  return (
    validateFreeFormIndexName(value) ??
    (hasSignalDataStreamShape(signal, value) ? undefined : 'signalPattern')
  );
};

export const validateDocsWritePattern = (
  pattern: string
): DocsWritePatternValidationError | undefined => {
  const value = pattern.trim();
  if (!value) {
    return undefined;
  }
  if (exceedsIndexNameBytes(value)) {
    return 'tooLong';
  }
  if (indexUsesTemplate(value)) {
    return 'template';
  }
  if (value !== value.toLowerCase()) {
    return 'uppercase';
  }
  if (AUTO_WRITE_PATTERN_INVALID_CHARS.test(value) || WHITESPACE_OR_CONTROL_CHARS.test(value)) {
    return 'invalidCharacter';
  }
  return DOCS_INDEX_PREFIX.test(value) ? undefined : 'docsPrefix';
};
