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
      access_token: {
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
      policy_shared_id: {
        type: 'keyword',
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
      updated_at: {
        type: 'date',
      },
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
  tokens: {
    properties: {
      type: {
        type: 'keyword',
      },
      token: {
        type: 'binary',
      },
      tokenHash: {
        type: 'keyword',
      },
      policy_id: {
        type: 'keyword',
      },
      policy_shared_id: {
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
      enrollment_rules: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          ip_ranges: { type: 'keyword' },
          window_duration: {
            type: 'nested',
            properties: {
              from: { type: 'date' },
              to: { type: 'date' },
            },
          },
          types: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
        },
      },
    },
  },
  agent_events: {
    properties: {
      type: { type: 'keyword' },
      agent_id: { type: 'keyword' },
      subtype: { type: 'keyword' },
      timestamp: { type: 'date' },
      message: { type: 'text' },
      payload: { type: 'text' },
      data: { type: 'text' },
    },
  },
};
