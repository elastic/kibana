/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateStreamName } from '@kbn/streams-schema';
import type { StreamsUnit } from '@kbn/streams-schema';
import type { Unit } from '../../../services/unit_repository';
import type {
  DestinationSignal,
  DestinationType,
  DestinationViewModel,
  ElasticsearchDestinationFormData,
  StaticIndexValidationError,
} from './types';

/** streams-spec elasticsearch.schema.yaml: an index containing `{{` is a template. */
const INDEX_TEMPLATE_PATTERN = /\{\{/;

export type UnitDestination = NonNullable<StreamsUnit.Configuration['destinations']>[number];

const LOCAL_ELASTICSEARCH_TYPE: DestinationType = 'elasticsearch';

export const DESTINATION_SIGNALS: DestinationSignal[] = ['logs', 'metrics', 'traces'];

const AUTO_PATTERN_BY_SIGNAL: Record<DestinationSignal, string> = {
  logs: 'logs-*-*',
  metrics: 'metrics-*-*',
  traces: 'traces-*-*',
};

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

const readConfigString = (
  destination: UnitDestination,
  name: string,
  signal?: DestinationSignal
): string | undefined => {
  const entries = destination.config?.filter((candidate) => candidate.name === name) ?? [];
  const scoped = signal
    ? entries.find((candidate) => candidate.telemetry?.includes(signal))
    : undefined;
  const unscoped = entries.find((candidate) => !candidate.telemetry);
  const entry = scoped ?? unscoped;
  return typeof entry?.value === 'string' && entry.value.trim() ? entry.value : undefined;
};

export const indexUsesTemplate = (index: string): boolean => INDEX_TEMPLATE_PATTERN.test(index);

const inferSignalFromIndex = (index: string | undefined): DestinationSignal | undefined => {
  if (!index) {
    return undefined;
  }
  return DESTINATION_SIGNALS.find((signal) => index.startsWith(`${signal}-`));
};

export const readDestinationSignal = (destination: UnitDestination): DestinationSignal => {
  const fromSupported = destination.supported_telemetry?.find(
    (candidate): candidate is DestinationSignal =>
      DESTINATION_SIGNALS.includes(candidate as DestinationSignal)
  );
  if (fromSupported) {
    return fromSupported;
  }
  return inferSignalFromIndex(readConfigString(destination, 'index')) ?? 'logs';
};

export const getFormDestinationSignals = (
  elasticsearch: ElasticsearchDestinationFormData
): DestinationSignal[] => {
  if (elasticsearch.auto) {
    return [...DESTINATION_SIGNALS];
  }
  return DESTINATION_SIGNALS.filter((signal) => elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim());
};

export interface DestinationCreateSpec {
  signal: DestinationSignal;
  index?: string;
}

export const getDestinationCreateSpecs = (
  elasticsearch: ElasticsearchDestinationFormData
): DestinationCreateSpec[] => {
  if (elasticsearch.auto) {
    return DESTINATION_SIGNALS.map((signal) => ({ signal }));
  }
  return DESTINATION_SIGNALS.flatMap((signal) => {
    const index = elasticsearch[SIGNAL_INDEX_FIELDS[signal]].trim();
    return index ? [{ signal, index }] : [];
  });
};

export const getDestinationWritePatterns = (
  destination: Pick<DestinationViewModel, 'signal' | 'mode' | 'index'>
): string[] => {
  if (destination.mode === 'auto' || !destination.index) {
    return [AUTO_PATTERN_BY_SIGNAL[destination.signal]];
  }
  return [destination.index];
};

export const toDestinationViewModel = (
  destination: UnitDestination
): DestinationViewModel | undefined => {
  if (destination.type !== LOCAL_ELASTICSEARCH_TYPE) {
    return undefined;
  }

  const signal = readDestinationSignal(destination);
  const index =
    readConfigString(destination, 'index') ?? readConfigString(destination, 'index', signal);
  return {
    id: destination.id,
    name: destination.name ?? destination.id,
    type: LOCAL_ELASTICSEARCH_TYPE,
    signal,
    mode: index ? 'static' : 'auto',
    index,
  };
};

export const getConfiguredDestinations = (unit: Unit): DestinationViewModel[] =>
  getUnitDestinations(unit).flatMap((destination) => {
    const configured = toDestinationViewModel(destination);
    return configured ? [configured] : [];
  });

/**
 * One Elasticsearch destination per signal with an unscoped `index`. The transpiler
 * rejects telemetry-scoped indices:
 * https://github.com/elastic/streams-transpiler/blob/89413933a7ce9d71e61032afa1c368d155eb3799/internal/registry/destinations_cloud_elasticsearch.go#L150-L152
 */
export const createUnitDestination = ({
  id,
  name,
  signal,
  index,
  apiKey,
}: {
  id: string;
  name: string;
  signal: DestinationSignal;
  index?: string;
  apiKey?: string;
}): UnitDestination => {
  const config: NonNullable<UnitDestination['config']> = [];
  const trimmedIndex = index?.trim();
  if (trimmedIndex) {
    config.push({ name: 'index', value: trimmedIndex });
  } else {
    config.push({
      name: 'index_patterns',
      value: [AUTO_PATTERN_BY_SIGNAL[signal]],
    });
  }

  if (apiKey) {
    config.push({ name: 'api_key', value: apiKey });
  }

  return {
    id,
    name,
    type: LOCAL_ELASTICSEARCH_TYPE,
    supported_telemetry: [signal],
    config,
  };
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
  const nameResult = validateStreamName(value);
  if (!nameResult.valid) {
    if (nameResult.error === 'uppercase') {
      return 'uppercase';
    }
    if (nameResult.error === 'invalidCharacter') {
      return 'invalidCharacter';
    }
    return 'invalidName';
  }
  const remainder = value.slice(`${signal}-`.length);
  if (!value.startsWith(`${signal}-`) || !remainder.includes('-') || remainder.startsWith('-')) {
    return 'signalPattern';
  }
  return undefined;
};
