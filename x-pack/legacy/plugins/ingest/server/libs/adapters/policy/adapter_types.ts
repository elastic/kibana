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
    policy_id: t.string,
  },
  'DatasourceInput'
);

const RuntimeDatasource = t.interface(
  {
    uuid: t.string,
    ref_source: t.union([t.undefined, t.string]),
    ref: t.union([t.undefined, t.string]),
    policy: t.union([t.undefined, t.string]),
    inputs: t.array(t.string),
  },
  'Datasource'
);

export const NewRuntimePolicyFile = t.interface(
  {
    name: t.string,
    description: t.string,
    output: t.string,
    monitoring_enabled: t.boolean,
    shared_id: t.string,
    version: t.number,
    status: t.union(['active', 'locked', 'inactive'].map(s => t.literal(s))),
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
    output: t.string,
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

export type NewBackupPolicyFile = t.TypeOf<typeof NewRuntimeBackupPolicyFile>;
export type BackupPolicyFile = t.TypeOf<typeof RuntimeBackupPolicyFile>;
export type PolicyFile = t.TypeOf<typeof RuntimePolicyFile>;
export type NewPolicyFile = t.TypeOf<typeof NewRuntimePolicyFile>;
export type Datasource = t.TypeOf<typeof RuntimeDatasource>;
export type DatasourceInput = t.TypeOf<typeof RuntimeDatasourceInput>;
