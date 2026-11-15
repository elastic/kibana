/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';

export type UnitDestination = NonNullable<StreamsUnit.Configuration['destinations']>[number];

const DESTINATION_SIGNALS = ['logs', 'metrics', 'traces'] as const;
type DestinationSignal = (typeof DESTINATION_SIGNALS)[number];

const AUTO_PATTERN_BY_SIGNAL: Record<DestinationSignal, string> = {
  logs: 'logs-*-*',
  metrics: 'metrics-*-*',
  traces: 'traces-*-*',
};

const isDestinationSignal = (value: string): value is DestinationSignal =>
  DESTINATION_SIGNALS.some((signal) => signal === value);

const readConfigValue = (destination: UnitDestination, name: string): unknown => {
  const entries = destination.config?.filter((candidate) => candidate.name === name) ?? [];
  const unscoped = entries.find((candidate) => !candidate.telemetry);
  return unscoped?.value;
};

const readIndexPatterns = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (pattern): pattern is string => typeof pattern === 'string' && pattern.trim().length > 0
    );
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0);
  }
  return [];
};

const readSignals = (destination: UnitDestination): DestinationSignal[] => {
  const fromSupported = (destination.supported_telemetry ?? []).filter(isDestinationSignal);
  return fromSupported.length > 0 ? fromSupported : ['logs'];
};

/**
 * Index globs an Elasticsearch destination is allowed to write to: a static
 * `index`, explicit `index_patterns`, or the auto signal patterns.
 */
export const getUnitDestinationWritePatterns = (destination: UnitDestination): string[] => {
  if (destination.type !== 'elasticsearch') {
    return [];
  }

  const index = readConfigValue(destination, 'index');
  if (typeof index === 'string' && index.trim()) {
    return [index.trim()];
  }

  const indexPatterns = readConfigValue(destination, 'index_patterns');
  const fromPatterns = readIndexPatterns(indexPatterns);
  if (fromPatterns.length > 0) {
    return fromPatterns;
  }

  return readSignals(destination).map((signal) => AUTO_PATTERN_BY_SIGNAL[signal]);
};
