/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const RuntimeDatasourceInput = t.interface(
  {
    id: t.string,
    meta: t.union([t.undefined, t.string]),
    config_id: t.string,
  },
  'DatasourceInput'
);

const DataSource = t.interface({
  uuid: t.string,
  ref_source: t.union([t.undefined, t.string]),
  ref: t.union([t.undefined, t.string]),
  config: t.union([t.undefined, t.string]),
  inputs: t.array(t.string),
});

export const NewRuntimeConfigurationFile = t.interface(
  {
    name: t.string,
    description: t.string,
    output: t.string,
    monitoring_enabled: t.boolean,
    shared_id: t.string,
    version: t.number,
    agent_version: t.string,
    data_sources: t.array(DataSource),
  },
  'ConfigurationFile'
);

export const NewRuntimeBackupConfigurationFile = t.interface(
  {
    name: t.string,
    description: t.string,
    output: t.string,
    monitoring_enabled: t.boolean,
    agent_version: t.string,
    flat_data_sources: t.string,
  },
  'BackupConfigurationFile'
);

const ExistingDocument = t.interface({
  id: t.string,
  shared_id: t.string,
  version: t.number,
  status: t.union([t.literal('active'), t.literal('locked'), t.literal('inactive')]),
  updated_at: t.string,
  created_by: t.union([t.undefined, t.string]),
  updated_on: t.string,
  updated_by: t.union([t.undefined, t.string]),
});

export const RuntimeBackupConfigurationFile = t.intersection([
  NewRuntimeBackupConfigurationFile,
  ExistingDocument,
]);

export const RuntimeConfigurationFile = t.intersection([
  NewRuntimeConfigurationFile,
  ExistingDocument,
]);

export type NewBackupConfigurationFile = t.TypeOf<typeof NewRuntimeBackupConfigurationFile>;
export type BackupConfigurationFile = t.TypeOf<typeof RuntimeBackupConfigurationFile>;
export type ConfigurationFile = t.TypeOf<typeof RuntimeConfigurationFile>;
export type NewConfigurationFile = t.TypeOf<typeof NewRuntimeConfigurationFile>;
export type DatasourceInput = t.TypeOf<typeof RuntimeDatasourceInput>;
