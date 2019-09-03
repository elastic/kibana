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
       * Used for phone home stats only.
       */
      objectType: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256
          }
        }
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
            ignore_above: 256
          }
        }
      },
    }
  },
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
  status: { type: 'keyword' },
  output: {
    type: 'object',
    properties: {
      content_type: { type: 'keyword' },
      content: { type: 'object', enabled: false }
    }
  }
};

export function createIndex(client, indexName,
  indexSettings = { }) {
  const body = {
    settings: {
      ...constants.DEFAULT_SETTING_INDEX_SETTINGS,
      ...indexSettings
    },
    mappings: {
      properties: schema
    }
  };

  return client.indices.exists({
    index: indexName,
  })
    .then((exists) => {
      if (!exists) {
        return client.indices.create({
          index: indexName,
          body: body
        })
          .then(() => true);
      }
      return exists;
    });
}
