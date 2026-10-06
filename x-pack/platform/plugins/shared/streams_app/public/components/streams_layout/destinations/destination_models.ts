/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { Unit } from '../../../services/unit_repository';
import type { DestinationType, DestinationViewModel } from './types';

/** streams-spec elasticsearch.schema.yaml: an index containing `{{` is a template. */
const INDEX_TEMPLATE_PATTERN = /\{\{/;

export type UnitDestination = NonNullable<StreamsUnit.Configuration['destinations']>[number];

const LOCAL_ELASTICSEARCH_TYPE: DestinationType = 'elasticsearch';

const LOCAL_ELASTICSEARCH_TELEMETRY: UnitDestination['supported_telemetry'] = [
  'logs',
  'metrics',
  'traces',
];

export const getUnitDestinations = (unit: Unit): UnitDestination[] => unit.unit.destinations ?? [];

export const withUnitDestinations = (unit: Unit, destinations: UnitDestination[]): Unit => ({
  ...unit,
  unit: {
    ...unit.unit,
    destinations,
  },
});

const readConfigString = (destination: UnitDestination, name: string): string | undefined => {
  const entry = destination.config?.find((candidate) => candidate.name === name);
  return typeof entry?.value === 'string' && entry.value.trim() ? entry.value : undefined;
};

const readConfigStringList = (destination: UnitDestination, name: string): string[] => {
  const entry = destination.config?.find((candidate) => candidate.name === name);
  if (!Array.isArray(entry?.value)) {
    return [];
  }
  return entry.value.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

export const indexUsesTemplate = (index: string): boolean => INDEX_TEMPLATE_PATTERN.test(index);

/** Splits a raw index-patterns field into the spec's unique non-empty string list. */
export const parseIndexPatterns = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);

const readDestinationIndex = (destination: UnitDestination): string =>
  readConfigString(destination, 'index') ?? destination.id;

/**
 * Stored `index_patterns`, or `[index]` for a static index. That default is
 * what streams-spec applies when the entry is omitted.
 */
const readDestinationIndexPatterns = (destination: UnitDestination, index: string): string[] => {
  const stored = readConfigStringList(destination, 'index_patterns');
  if (stored.length > 0) {
    return stored;
  }
  return indexUsesTemplate(index) ? [] : [index];
};

export const toDestinationViewModel = (
  destination: UnitDestination
): DestinationViewModel | undefined => {
  if (destination.type !== LOCAL_ELASTICSEARCH_TYPE) {
    return undefined;
  }

  const index = readDestinationIndex(destination);
  return {
    id: destination.id,
    name: destination.name ?? destination.id,
    type: LOCAL_ELASTICSEARCH_TYPE,
    index,
    indexPatterns: readDestinationIndexPatterns(destination, index),
  };
};

export const getConfiguredDestinations = (unit: Unit): DestinationViewModel[] =>
  getUnitDestinations(unit).flatMap((destination) => {
    const configured = toDestinationViewModel(destination);
    return configured ? [configured] : [];
  });

/**
 * Local Elasticsearch destination matching streams-spec `elasticsearch.schema.yaml`.
 * `index` is required. `index_patterns` is written when the index is a template
 * (`{{`) or the user supplied patterns. A static index omits the entry so the
 * spec default of `[index]` applies.
 */
export const createUnitDestination = ({
  id,
  name,
  index,
  indexPatterns,
}: {
  id: string;
  name: string;
  index: string;
  indexPatterns: string[];
}): UnitDestination => {
  const config: NonNullable<UnitDestination['config']> = [{ name: 'index', value: index }];
  if (indexUsesTemplate(index) || indexPatterns.length > 0) {
    config.push({ name: 'index_patterns', value: indexPatterns });
  }
  return {
    id,
    name,
    type: LOCAL_ELASTICSEARCH_TYPE,
    supported_telemetry: LOCAL_ELASTICSEARCH_TELEMETRY,
    config,
  };
};
