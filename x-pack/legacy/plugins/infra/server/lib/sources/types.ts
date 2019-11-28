/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import * as runtimeTypes from 'io-ts';
import moment from 'moment';
import { pipe } from 'fp-ts/lib/pipeable';
import { chain } from 'fp-ts/lib/Either';

export const TimestampFromString = new runtimeTypes.Type<number, string>(
  'TimestampFromString',
  (input): input is number => typeof input === 'number',
  (input, context) =>
    pipe(
      runtimeTypes.string.validate(input, context),
      chain(stringInput => {
        const momentValue = moment(stringInput);
        return momentValue.isValid()
          ? runtimeTypes.success(momentValue.valueOf())
          : runtimeTypes.failure(stringInput, context);
      })
    ),
  output => new Date(output).toISOString()
);

/**
 * Stored source configuration as read from and written to saved objects
 */

const SavedSourceConfigurationFieldsRuntimeType = runtimeTypes.partial({
  container: runtimeTypes.string,
  host: runtimeTypes.string,
  pod: runtimeTypes.string,
  tiebreaker: runtimeTypes.string,
  timestamp: runtimeTypes.string,
});

export const SavedSourceConfigurationTimestampColumnRuntimeType = runtimeTypes.type({
  timestampColumn: runtimeTypes.type({
    id: runtimeTypes.string,
  }),
});

export const SavedSourceConfigurationMessageColumnRuntimeType = runtimeTypes.type({
  messageColumn: runtimeTypes.type({
    id: runtimeTypes.string,
  }),
});

export const SavedSourceConfigurationFieldColumnRuntimeType = runtimeTypes.type({
  fieldColumn: runtimeTypes.type({
    id: runtimeTypes.string,
    field: runtimeTypes.string,
  }),
});

export const SavedSourceConfigurationColumnRuntimeType = runtimeTypes.union([
  SavedSourceConfigurationTimestampColumnRuntimeType,
  SavedSourceConfigurationMessageColumnRuntimeType,
  SavedSourceConfigurationFieldColumnRuntimeType,
]);

export const SavedSourceConfigurationRuntimeType = runtimeTypes.partial({
  name: runtimeTypes.string,
  description: runtimeTypes.string,
  metricAlias: runtimeTypes.string,
  logAlias: runtimeTypes.string,
  fields: SavedSourceConfigurationFieldsRuntimeType,
  logColumns: runtimeTypes.array(SavedSourceConfigurationColumnRuntimeType),
});

export interface InfraSavedSourceConfiguration
  extends runtimeTypes.TypeOf<typeof SavedSourceConfigurationRuntimeType> {}

export const pickSavedSourceConfiguration = (
  value: InfraSourceConfiguration
): InfraSavedSourceConfiguration => {
  const { name, description, metricAlias, logAlias, fields, logColumns } = value;
  const { container, host, pod, tiebreaker, timestamp } = fields;

  return {
    name,
    description,
    metricAlias,
    logAlias,
    fields: { container, host, pod, tiebreaker, timestamp },
    logColumns,
  };
};

/**
 * Static source configuration as read from the configuration file
 */

const StaticSourceConfigurationFieldsRuntimeType = runtimeTypes.partial({
  ...SavedSourceConfigurationFieldsRuntimeType.props,
  message: runtimeTypes.array(runtimeTypes.string),
});

export const StaticSourceConfigurationRuntimeType = runtimeTypes.partial({
  name: runtimeTypes.string,
  description: runtimeTypes.string,
  metricAlias: runtimeTypes.string,
  logAlias: runtimeTypes.string,
  fields: StaticSourceConfigurationFieldsRuntimeType,
  logColumns: runtimeTypes.array(SavedSourceConfigurationColumnRuntimeType),
});

export interface InfraStaticSourceConfiguration
  extends runtimeTypes.TypeOf<typeof StaticSourceConfigurationRuntimeType> {}

/**
 * Full source configuration type after all cleanup has been done at the edges
 */

const SourceConfigurationFieldsRuntimeType = runtimeTypes.type({
  ...StaticSourceConfigurationFieldsRuntimeType.props,
});

export const SourceConfigurationRuntimeType = runtimeTypes.type({
  ...SavedSourceConfigurationRuntimeType.props,
  fields: SourceConfigurationFieldsRuntimeType,
  logColumns: runtimeTypes.array(SavedSourceConfigurationColumnRuntimeType),
});

export interface InfraSourceConfiguration
  extends runtimeTypes.TypeOf<typeof SourceConfigurationRuntimeType> {}

/**
 * Saved object type with metadata
 */

export const SourceConfigurationSavedObjectRuntimeType = runtimeTypes.intersection([
  runtimeTypes.type({
    id: runtimeTypes.string,
    attributes: SavedSourceConfigurationRuntimeType,
  }),
  runtimeTypes.partial({
    version: runtimeTypes.string,
    updated_at: TimestampFromString,
  }),
]);

export interface SourceConfigurationSavedObject
  extends runtimeTypes.TypeOf<typeof SourceConfigurationSavedObjectRuntimeType> {}
