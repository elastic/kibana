/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '../models/unit';

export type UnitDestination = NonNullable<StreamsUnit.Configuration['destinations']>[number];

export const UNIT_DESTINATION_SIGNALS = ['logs', 'metrics', 'traces'] as const;
export type UnitDestinationSignal = (typeof UNIT_DESTINATION_SIGNALS)[number];

/** Write pattern of a signal that has neither a static `index` nor `write_patterns`. */
export const AUTO_WRITE_PATTERN_BY_SIGNAL: Readonly<Record<UnitDestinationSignal, string>> = {
  logs: 'logs-*-*',
  metrics: 'metrics-*-*',
  traces: 'traces-*-*',
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

/** Supported OTLP signals. Other signals, such as `docs`, have no write targets yet. */
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
        return [index];
      }
      const writePatterns = writePatternsBySignal[signal];
      return writePatterns?.length ? writePatterns : [AUTO_WRITE_PATTERN_BY_SIGNAL[signal]];
    })
  ),
];

/** Indices, or index globs, an Elasticsearch destination writes to; none for other types. */
export const getUnitDestinationWritePatterns = (destination: UnitDestination): string[] =>
  destination.type === 'elasticsearch'
    ? getSignalTargetsWritePatterns(getUnitDestinationSignalTargets(destination))
    : [];
