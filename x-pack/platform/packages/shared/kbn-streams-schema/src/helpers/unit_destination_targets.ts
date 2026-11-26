/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '../models/unit';
import {
  MAX_OTEL_DATA_STREAM_PART_LENGTH,
  OTEL_TYPE_SEPARATOR,
  PROMETHEUS_TYPE_SEPARATOR,
} from './otel_data_stream_name';

export type UnitDestination = NonNullable<StreamsUnit.Configuration['destinations']>[number];

export const UNIT_DESTINATION_SIGNALS = ['logs', 'metrics', 'traces', 'docs'] as const;
export type UnitDestinationSignal = (typeof UNIT_DESTINATION_SIGNALS)[number];

/**
 * Write patterns of a signal with neither a static `index` nor `write_patterns`. Docs keep the
 * request's `_index`, which the managed bulk receiver limits to these prefixes.
 */
export const AUTO_WRITE_PATTERNS_BY_SIGNAL: Readonly<
  Record<UnitDestinationSignal, readonly string[]>
> = {
  logs: ['logs-*-*'],
  metrics: ['metrics-*-*'],
  traces: ['traces-*-*'],
  docs: ['logs-*', 'metrics-*', 'traces-*'],
};

/** Per-signal targets of an Elasticsearch destination. */
export interface UnitDestinationSignalTargets {
  signals: UnitDestinationSignal[];
  /** Static `index` per signal. A signal without one is routed dynamically. */
  indexBySignal: Partial<Record<UnitDestinationSignal, string>>;
  /** `write_patterns` per signal, scoping the destination credential. */
  writePatternsBySignal: Partial<Record<UnitDestinationSignal, string[]>>;
}

const isUnitDestinationSignal = (value: string): value is UnitDestinationSignal =>
  UNIT_DESTINATION_SIGNALS.some((signal) => signal === value);

/**
 * Value of a destination config entry. For a signal, a telemetry-scoped entry takes precedence
 * over an unscoped one, which applies to every signal.
 */
export const readUnitDestinationConfigValue = (
  destination: UnitDestination,
  name: string,
  signal?: UnitDestinationSignal
): unknown => {
  const entries = destination.config?.filter((candidate) => candidate.name === name) ?? [];
  const scoped = signal
    ? entries.find((candidate) => candidate.telemetry?.includes(signal))
    : undefined;
  const unscoped = entries.find((candidate) => !candidate.telemetry?.length);
  return (scoped ?? unscoped)?.value;
};

const readConfigString = (
  destination: UnitDestination,
  name: string,
  signal?: UnitDestinationSignal
): string | undefined => {
  const value = readUnitDestinationConfigValue(destination, name, signal);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const readConfigPatterns = (
  destination: UnitDestination,
  name: string,
  signal: UnitDestinationSignal
): string[] => {
  const value = readUnitDestinationConfigValue(destination, name, signal);
  const patterns = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return patterns.flatMap((pattern) =>
    typeof pattern === 'string' && pattern.trim() ? [pattern.trim()] : []
  );
};

/** Drops signals with no write targets, such as `profiles`. */
export const readUnitDestinationSignals = (destination: UnitDestination): UnitDestinationSignal[] =>
  destination.supported_telemetry.filter(isUnitDestinationSignal);

export const getUnitDestinationSignalTargets = (
  destination: UnitDestination
): UnitDestinationSignalTargets => {
  const signals = readUnitDestinationSignals(destination);
  const indexBySignal: UnitDestinationSignalTargets['indexBySignal'] = {};
  const writePatternsBySignal: UnitDestinationSignalTargets['writePatternsBySignal'] = {};
  for (const signal of signals) {
    const index = readConfigString(destination, 'index', signal);
    if (index) {
      indexBySignal[signal] = index;
    }
    const writePatterns = readConfigPatterns(destination, 'write_patterns', signal);
    if (writePatterns.length > 0) {
      writePatternsBySignal[signal] = writePatterns;
    }
  }
  return { signals, indexBySignal, writePatternsBySignal };
};

const METRICS_PREFIX = 'metrics-';
const PROMETHEUS_TYPE_SEPARATORS = [OTEL_TYPE_SEPARATOR, PROMETHEUS_TYPE_SEPARATOR];
const DISALLOWED_IN_DATASET = /[\\/*?"<>| ,#:-]/g;
const DISALLOWED_IN_NAMESPACE = /[\\/*?"<>| ,#:]/g;

const isDotSegment = (part: string): boolean => part === '.' || part === '..';

const splitDatasetAndNamespace = (rest: string): [string, string] => {
  const [typeSeparator] = PROMETHEUS_TYPE_SEPARATORS.map((separator) => ({
    at: rest.indexOf(separator),
    length: separator.length,
  }))
    .filter(({ at }) => at >= 0)
    .sort((left, right) => left.at - right.at);
  if (typeSeparator) {
    return [rest.slice(0, typeSeparator.at), rest.slice(typeSeparator.at + typeSeparator.length)];
  }
  const lastDash = rest.lastIndexOf('-');
  return lastDash >= 0 ? [rest.slice(0, lastDash), rest.slice(lastDash + 1)] : ['', ''];
};

const splitPrometheusIndex = (
  index: string
): { dataset: string; namespace: string } | undefined => {
  if (!index.startsWith(METRICS_PREFIX)) {
    return undefined;
  }
  const [dataset, namespace] = splitDatasetAndNamespace(index.slice(METRICS_PREFIX.length));
  return dataset && namespace && !isDotSegment(dataset) && !isDotSegment(namespace)
    ? { dataset, namespace }
    : undefined;
};

const sanitizeDataStreamPart = (part: string, disallowed: RegExp): string =>
  part.toLowerCase().slice(0, MAX_OTEL_DATA_STREAM_PART_LENGTH).replace(disallowed, '_');

/**
 * The data stream Prometheus remote write lands in for a fixed metrics index. Mirrors
 * streams-transpiler `prometheusDataStream`, then Elasticsearch `DataStream.sanitizeDataset`/`sanitizeNamespace`.
 */
export const getPrometheusDataStream = (metricsIndex: string): string => {
  const { dataset, namespace } = splitPrometheusIndex(metricsIndex) ?? {
    dataset: 'generic',
    namespace: 'default',
  };
  return `metrics-${sanitizeDataStreamPart(
    dataset,
    DISALLOWED_IN_DATASET
  )}.prometheus-${sanitizeDataStreamPart(namespace, DISALLOWED_IN_NAMESPACE)}`;
};

/**
 * Indices, or index globs, written to per signal: a static `index`, else its `write_patterns`,
 * else the auto signal pattern. A static index is where documents go, so `write_patterns` next
 * to it only scope the credential.
 */
export const getSignalTargetsWritePatterns = ({
  signals,
  indexBySignal,
  writePatternsBySignal,
}: UnitDestinationSignalTargets): string[] => [
  ...new Set(
    signals.flatMap((signal) => {
      const index = indexBySignal[signal];
      if (index) {
        return signal === 'metrics' ? [index, getPrometheusDataStream(index)] : [index];
      }
      const writePatterns = writePatternsBySignal[signal];
      return writePatterns?.length ? writePatterns : AUTO_WRITE_PATTERNS_BY_SIGNAL[signal];
    })
  ),
];

/** Indices, or index globs, an Elasticsearch destination writes to; none for other types. */
export const getUnitDestinationWritePatterns = (destination: UnitDestination): string[] =>
  destination.type === 'elasticsearch'
    ? getSignalTargetsWritePatterns(getUnitDestinationSignalTargets(destination))
    : [];
