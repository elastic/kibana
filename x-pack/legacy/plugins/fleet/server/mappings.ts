/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mappings = {
  agents: {
    properties: {
      shared_id: {
        type: 'keyword',
      },
      type: {
        type: 'keyword',
      },
      active: {
        type: 'boolean',
      },
      enrolled_at: {
        type: 'date',
      },
      access_api_key_id: {
        type: 'keyword',
      },
      // FIXME_INGEST https://github.com/elastic/kibana/issues/56554
      default_api_key: {
        type: 'keyword',
      },
      version: {
        type: 'keyword',
      },
      user_provided_metadata: {
        type: 'text',
      },
      local_metadata: {
        type: 'text',
      },
      policy_id: {
        type: 'keyword',
      },
      last_updated: {
        type: 'date',
      },
      last_checkin: {
        type: 'date',
      },
      config_updated_at: {
        type: 'date',
      },
      updated_at: {
        type: 'date',
      },
      current_error_events: {
        type: 'text',
      },
      // FIXME_INGEST https://github.com/elastic/kibana/issues/56554
      actions: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          type: { type: 'keyword' },
          data: { type: 'text' },
          sent_at: { type: 'date' },
          created_at: { type: 'date' },
        },
      },
    },
  },
  enrollment_api_keys: {
    properties: {
      name: {
        type: 'keyword',
      },
      type: {
        type: 'keyword',
      },
      api_key: {
        type: 'binary',
      },
      api_key_id: {
        type: 'keyword',
      },
      policy_id: {
        type: 'keyword',
      },
      created_at: {
        type: 'date',
      },
      updated_at: {
        type: 'date',
      },
      expire_at: {
        type: 'date',
      },
      active: {
        type: 'boolean',
      },
    },
  },
  agent_events: {
    properties: {
      type: { type: 'keyword' },
      subtype: { type: 'keyword' },
      agent_id: { type: 'keyword' },
      action_id: { type: 'keyword' },
      policy_id: { type: 'keyword' },
      stream_id: { type: 'keyword' },
      timestamp: { type: 'date' },
      message: { type: 'text' },
      payload: { type: 'text' },
      data: { type: 'text' },
    },
  },
};
