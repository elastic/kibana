/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

const DEFAULT_REPOSITORY_SETTING = 'repositories.default_repository';

export const LOCAL_REPOSITORY_NAME = 'index-management-api-snapshot-repo';

// The repository every Elastic Cloud deployment ships with; Cloud has no `path.repo` to back an `fs` one.
export const CLOUD_REPOSITORY_NAME = 'found-snapshots';

// `defaultRepository` is undefined without a default, and therefore omitted from the JSON response.
export const RESPONSE_KEYS_WITHOUT_DEFAULT = [
  'canCreateRepository',
  'hasDefaultRepository',
  'hasRepositories',
];

// `/tmp/repo` is one of the locations Scout's local stateful cluster allows in `path.repo`.
export const createLocalRepository = async (esClient: EsClient) => {
  await esClient.snapshot.createRepository({
    name: LOCAL_REPOSITORY_NAME,
    repository: { type: 'fs', settings: { location: '/tmp/repo' } },
    verify: false,
  });
};

export const deleteAllRepositories = async (esClient: EsClient) => {
  await esClient.snapshot.deleteRepository({ name: '*' }, { ignore: [404] });
};

export const setDefaultRepository = async (esClient: EsClient, name: string) => {
  await esClient.cluster.putSettings({ persistent: { [DEFAULT_REPOSITORY_SETTING]: name } });
};

export const clearDefaultRepository = async (esClient: EsClient) => {
  await esClient.cluster.putSettings({ persistent: { [DEFAULT_REPOSITORY_SETTING]: null } });
};
