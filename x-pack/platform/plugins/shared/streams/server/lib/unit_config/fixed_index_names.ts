/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_OTEL_DATASET_BYTES,
  MAX_OTEL_NAMESPACE_BYTES,
  readUnitDestinationConfigValue,
  validateOtelDataStreamIndex,
  type OtelDataStreamNameError,
  type OtelDataStreamSignal,
  type StreamsUnit,
  type UnitDestination,
} from '@kbn/streams-schema';

const ELASTICSEARCH_DESTINATION_TYPES = ['elasticsearch', 'remote_elasticsearch'];
const OTEL_SIGNALS: OtelDataStreamSignal[] = ['logs', 'metrics', 'traces'];

export interface InvalidFixedIndex {
  destinationId: string;
  signal: OtelDataStreamSignal;
  index: string;
  error: OtelDataStreamNameError | 'shape';
}

interface CheckedDestination {
  id: string;
  signals: OtelDataStreamSignal[];
  /** The raw `index` value per signal, untrimmed, as the unit stores it. */
  indexBySignal: Partial<Record<OtelDataStreamSignal, string>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The PUT route does not schema-validate the unit. An entry with malformed `telemetry` counts as
// unscoped, so it can't skip the check. Anything else malformed is left to the distributor.
const toCheckedDestination = (destination: unknown): CheckedDestination | undefined => {
  if (
    !isRecord(destination) ||
    typeof destination.id !== 'string' ||
    typeof destination.type !== 'string' ||
    !ELASTICSEARCH_DESTINATION_TYPES.includes(destination.type) ||
    !Array.isArray(destination.supported_telemetry) ||
    !Array.isArray(destination.config ?? [])
  ) {
    return undefined;
  }
  const { supported_telemetry: supportedTelemetry } = destination;
  const config = ((destination.config ?? []) as unknown[]).filter(isRecord).map((entry) => ({
    ...entry,
    telemetry: Array.isArray(entry.telemetry) ? entry.telemetry : undefined,
  }));
  const normalized = { config } as unknown as UnitDestination;
  const signals = OTEL_SIGNALS.filter((signal) => supportedTelemetry.includes(signal));
  const indexBySignal: CheckedDestination['indexBySignal'] = {};
  for (const signal of signals) {
    const value = readUnitDestinationConfigValue(normalized, 'index', signal);
    if (typeof value === 'string' && value.trim()) {
      indexBySignal[signal] = value;
    }
  }
  return { id: destination.id, signals, indexBySignal };
};

const checkedDestinationsOf = (unit: StreamsUnit.Configuration | undefined): CheckedDestination[] =>
  (Array.isArray(unit?.destinations) ? (unit?.destinations as unknown[]) : []).flatMap(
    (destination) => {
      const checked = toCheckedDestination(destination);
      return checked ? [checked] : [];
    }
  );

/** Fixed logs, metrics and traces indices that are new or changed since the stored unit and not OTel data stream names. */
export const findInvalidFixedIndices = ({
  unit,
  previousUnit,
}: {
  unit: StreamsUnit.Configuration;
  previousUnit: StreamsUnit.Configuration | undefined;
}): InvalidFixedIndex[] => {
  const previousById = new Map(
    checkedDestinationsOf(previousUnit).map(({ id, indexBySignal }) => [id, indexBySignal])
  );

  return checkedDestinationsOf(unit).flatMap(({ id, signals, indexBySignal }) => {
    const previous = previousById.get(id);
    return signals.flatMap((signal) => {
      const index = indexBySignal[signal];
      if (index === undefined || previous?.[signal] === index) {
        return [];
      }
      const error = validateOtelDataStreamIndex(signal, index);
      return error ? [{ destinationId: id, signal, index, error }] : [];
    });
  });
};

const REASONS: Record<OtelDataStreamNameError, string> = {
  datasetRequired: 'the dataset is empty',
  namespaceRequired: 'the namespace is empty',
  template: 'templates are not supported',
  uppercase: 'it must be lowercase',
  hyphen: 'the dataset and namespace cannot contain "-"',
  invalidCharacter: 'it cannot contain whitespace, invisible characters or \\ / * ? " < > | , # :',
  invalidName: 'the dataset and namespace cannot be "." or ".."',
  typeSuffix: 'the dataset cannot end in .otel or .prometheus, which are added to it',
  partTooLong: `the dataset can be at most ${MAX_OTEL_DATASET_BYTES} bytes and the namespace at most ${MAX_OTEL_NAMESPACE_BYTES}`,
};

export const describeInvalidFixedIndex = ({
  destinationId,
  signal,
  index,
  error,
}: InvalidFixedIndex): string => {
  const prefix = `Destination [${destinationId}] writes ${signal} to [${index}], which is not`;
  const shape = `${signal}-<dataset>.otel-<namespace>`;
  return error === 'shape'
    ? `${prefix} shaped ${shape} (for example ${signal}-billing.otel-default). Only those data streams have the OpenTelemetry index templates.`
    : `${prefix} a valid ${shape} name: ${REASONS[error]}.`;
};
