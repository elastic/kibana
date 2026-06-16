/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader, EsClient, SamlAuth } from '@kbn/scout';
import {
  CLOUD_SNAPSHOT_REPOSITORY,
  DEPRECATION_LOGS_INDEX,
  DEPRECATION_LOGS_ORIGIN_FIELD,
} from './constants';

export const getAdminCookieHeader = async (samlAuth: SamlAuth): Promise<CookieHeader> => {
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  return cookieHeader;
};

export const createReindexOperationWithLargeErrorMessage = () => ({
  'upgrade-assistant-reindex-operation': {
    indexName: 'filebeat-2019',
    newIndexName: 'reindexed-v7-filebeat-2019',
    status: 2,
    lastCompletedStep: 40,
    locked: null,
    reindexTaskId: 'scout-node:151888',
    reindexTaskPercComplete: 0,
    errorMessage: `Error: Reindexing failed: ${'bulk failure '.repeat(50_000)}`,
    runningReindexCount: null,
  },
  type: 'upgrade-assistant-reindex-operation',
});

export const createCloudRepository = async (esClient: EsClient) => {
  await esClient.snapshot.createRepository({
    name: CLOUD_SNAPSHOT_REPOSITORY,
    repository: {
      type: 'fs',
      settings: {
        location: '/tmp/cloud-snapshots/',
      },
    },
    verify: false,
  });
};

export const createCloudSnapshot = async (esClient: EsClient, snapshotName: string) => {
  return await esClient.snapshot.create({
    repository: CLOUD_SNAPSHOT_REPOSITORY,
    snapshot: snapshotName,
    wait_for_completion: true,
    indices: 'this_index_doesnt_exist',
    ignore_unavailable: true,
    include_global_state: false,
  });
};

export const deleteCloudSnapshot = async (esClient: EsClient, snapshotName: string) => {
  await esClient.snapshot.delete({
    repository: CLOUD_SNAPSHOT_REPOSITORY,
    snapshot: snapshotName,
  });
};

const deprecationLogDocument = {
  'event.dataset': 'elasticsearch.deprecation',
  '@timestamp': '2021-12-06T16:28:11,104Z',
  'log.level': 'CRITICAL',
  'log.logger':
    'org.elasticsearch.deprecation.rest.action.admin.indices.RestGetIndexTemplateAction',
  'elasticsearch.cluster.name': 'es-test-cluster',
  'elasticsearch.cluster.uuid': 'PBE1syg4ToKCA0DcD2nKEw',
  'elasticsearch.node.id': '_0gaVTs5TIO_JWuFl9URJA',
  'elasticsearch.node.name': 'node-01',
  message:
    '[types removal] Specifying include_type_name in get index template requests is deprecated.',
  'data_stream.type': 'logs',
  'data_stream.dataset': 'elasticsearch.deprecation',
  'data_stream.namespace': 'default',
  'ecs.version': '1.7',
  'elasticsearch.event.category': 'types',
  'event.code': 'get_index_template_include_type_name',
  'elasticsearch.http.request.x_opaque_id': 'd17e37e2-d41f-49cc-8186-35bcdcd99770',
};

export const createDeprecationLog = async (
  esClient: EsClient,
  id: string,
  isElasticProduct = false
) => {
  const document = isElasticProduct
    ? { ...deprecationLogDocument, [DEPRECATION_LOGS_ORIGIN_FIELD]: 'kibana' }
    : deprecationLogDocument;

  await esClient.index({
    id,
    index: DEPRECATION_LOGS_INDEX,
    op_type: 'create',
    refresh: true,
    document,
  });
};

export const deleteDeprecationLogs = async (esClient: EsClient, docIds: string[]) => {
  await esClient.deleteByQuery({
    index: DEPRECATION_LOGS_INDEX,
    refresh: true,
    query: {
      ids: { values: docIds },
    },
  });
};
