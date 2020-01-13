/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { constants } from '../constants';

const schema = {
  meta: {
    // We are indexing these properties with both text and keyword fields because that's what will be auto generated
    // when an index already exists. This schema is only used when a reporting index doesn't exist.  This way existing
    // reporting indexes and new reporting indexes will look the same and the data can be queried in the same
    // manner.
    properties: {
      /**
       * Type of object that is triggering this report. Should be either search, visualization or dashboard.
       * Used for job listing and telemetry stats only.
       */
      objectType: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      /**
       * Can be either preserve_layout, print or none (in the case of csv export).
       * Used for phone home stats only.
       */
      layout: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
    },
  },
  browser_type: { type: 'keyword' },
  jobtype: { type: 'keyword' },
  payload: { type: 'object', enabled: false },
  priority: { type: 'byte' },
  timeout: { type: 'long' },
  process_expiration: { type: 'date' },
  created_by: { type: 'keyword' },
  created_at: { type: 'date' },
  started_at: { type: 'date' },
  completed_at: { type: 'date' },
  attempts: { type: 'short' },
  max_attempts: { type: 'short' },
  kibana_name: { type: 'keyword' },
  kibana_id: { type: 'keyword' },
  status: { type: 'keyword' },
  output: {
    type: 'object',
    properties: {
      content_type: { type: 'keyword' },
      size: { type: 'long' },
      content: { type: 'object', enabled: false },
    },
  },
};

export function createIndex(client, indexName, indexSettings = {}) {
  const body = {
    settings: {
      ...constants.DEFAULT_SETTING_INDEX_SETTINGS,
      ...indexSettings,
    },
    mappings: {
      properties: schema,
    },
  };

  return client
    .callWithInternalUser('indices.exists', {
      index: indexName,
    })
    .then(exists => {
      if (!exists) {
        return client
          .callWithInternalUser('indices.create', {
            index: indexName,
            body: body,
          })
          .then(() => true)
          .catch(err => {
            /* FIXME creating the index will fail if there were multiple jobs staged in parallel.
             * Each staged job checks `client.indices.exists` and could each get `false` as a response.
             * Only the first job in line can successfully create it though.
             * The problem might only happen in automated tests, where the indices are deleted after each test run.
             * This catch block is in place to not fail a job if the job runner hits this race condition.
             * Unfortunately we don't have a logger in scope to log a warning.
             */
            const isIndexExistsError =
              err &&
              err.body &&
              err.body.error &&
              err.body.error.type === 'resource_already_exists_exception';
            if (isIndexExistsError) {
              return true;
            }

            throw err;
          });
      }
      return exists;
    });
}
