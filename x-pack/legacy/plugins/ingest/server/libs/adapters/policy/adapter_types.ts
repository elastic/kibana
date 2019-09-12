/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const RuntimeDatasourceInput = t.intersection([
  t.interface(
    {
      data_source_id: t.string,
    },
    'DatasourceInput'
  ),
  t.partial({
    meta: t.string,
  }),
  t.UnknownRecord,
]);

const RuntimeDatasource = t.interface(
  {
    uuid: t.string,
    ref_source: t.union([t.undefined, t.string]),
    ref: t.union([t.undefined, t.string]),
    output: t.string,
    queue: t.union([t.undefined, t.string]),
    inputs: t.array(t.string),
  },
  'Datasource'
);

const NewRuntimeDatasource = t.interface(
  {
    ref_source: t.union([t.undefined, t.string]),
    ref: t.union([t.undefined, t.string]),
    output: t.string,
    queue: t.union([t.undefined, t.object]),
    inputs: t.array(t.object),
  },
  'NewDatasource'
);

export const NewRuntimePolicyFile = t.interface(
  {
    name: t.string,
    description: t.string,
    monitoring_enabled: t.boolean,
    shared_id: t.string,
    version: t.number,
    status: t.keyof({
      active: null,
      locked: null,
      inactive: null,
    }),
    agent_version: t.string,
    data_sources: t.array(RuntimeDatasource),
    created_on: t.string,
    created_by: t.union([t.undefined, t.string]),
    updated_on: t.string,
    updated_by: t.union([t.undefined, t.string]),
  },
  'PolicyFile'
);

export const NewRuntimeBackupPolicyFile = t.interface(
  {
    name: t.string,
    description: t.string,
    monitoring_enabled: t.boolean,
    agent_version: t.string,
    flat_data_sources: t.string,
  },
  'BackupPolicyFile'
);

const ExistingDocument = t.interface({
  id: t.string,
  updated_on: t.string,
  updated_by: t.union([t.undefined, t.string]),
});

export const RuntimeBackupPolicyFile = t.intersection([
  NewRuntimeBackupPolicyFile,
  ExistingDocument,
]);

export const RuntimePolicyFile = t.intersection([NewRuntimePolicyFile, ExistingDocument]);
export const FullRuntimePolicyFile = t.intersection([
  RuntimePolicyFile,
  t.type({
    data_sources: t.array(
      t.intersection([
        RuntimeDatasource,
        t.type({
          inputs: t.array(RuntimeDatasourceInput),
        }),
      ])
    ),
  }),
]);

export type NewBackupPolicyFile = t.TypeOf<typeof NewRuntimeBackupPolicyFile>;
export type BackupPolicyFile = t.TypeOf<typeof RuntimeBackupPolicyFile>;
export type PolicyFile = t.TypeOf<typeof RuntimePolicyFile>;
export type NewPolicyFile = t.TypeOf<typeof NewRuntimePolicyFile>;
export type NewDatasource = t.TypeOf<typeof NewRuntimeDatasource>;
export type Datasource = t.TypeOf<typeof RuntimeDatasource>;
export type DatasourceInput = t.TypeOf<typeof RuntimeDatasourceInput>;
export type FullPolicyFile = t.TypeOf<typeof FullRuntimePolicyFile>;
